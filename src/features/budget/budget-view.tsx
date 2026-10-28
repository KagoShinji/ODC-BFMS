"use client";

import { useState, type FormEvent } from "react";
import { Plus, Wallet, X } from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import { availableForLine, committedForLine, dashboardTotals, parseMoney } from "@/domain/finance";
import type { BudgetLine } from "@/domain/types";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PageHeading,
  SearchField,
  tableClass,
  tdClass,
  thClass,
} from "@/components/financial/shared";

export function BudgetView() {
  const { data, addBudgetLine } = useFinance();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<BudgetLine["category"]>("Maintenance & Operations");
  const [amount, setAmount] = useState("");
  const totals = dashboardTotals(data);
  const filtered = data.budgetLines.filter((line) =>
    `${line.code} ${line.name} ${line.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const centavos = parseMoney(amount);
    if (centavos === null) return;
    const result = await addBudgetLine({ code, name, category, appropriation: centavos });
    if (result.ok) {
      setOpen(false);
      setCode("");
      setName("");
      setAmount("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="BUDGET MANAGEMENT"
        title="Budget overview"
        description="Monitor appropriations and spending authority for the current fiscal year."
        action={
          <Button variant="accent" onClick={() => setOpen(!open)}>
            <Plus size={16} /> Add budget line
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total appropriation",
            value: totals.appropriation,
            sub: `${data.budgetLines.length} active budget lines`,
            color: "#f56618",
          },
          {
            label: "Obligated",
            value: totals.obligated,
            sub: `${totals.appropriation ? Math.round((totals.obligated / totals.appropriation) * 100) : 0}% of total budget`,
            color: "#54758d",
          },
          {
            label: "Available to commit",
            value: totals.available,
            sub: "After submitted vouchers",
            color: "#609076",
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#83919b]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </div>
              <div className="money text-[23px] font-bold tracking-tight text-[#1a3042]">
                {formatMoney(item.value)}
              </div>
              <div className="mt-2 text-[11px] text-[#9aa5aa]">{item.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {open && (
        <Card className="mb-6 border-[#ffc59d]">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Add a demo budget line</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close form"
            >
              <X size={17} />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="text-xs font-semibold text-[#526575]">
                Code
                <Input
                  className="mt-1.5"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="MOOE-004"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-[#526575] xl:col-span-2">
                Budget line name
                <Input
                  className="mt-1.5"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Community programs"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-[#526575]">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as BudgetLine["category"])}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#d9dedf] bg-white px-3 text-sm"
                >
                  <option>Personnel Services</option>
                  <option>Maintenance & Operations</option>
                  <option>Capital Outlay</option>
                  <option>Transfers</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-[#526575]">
                Appropriation (₱)
                <Input
                  className="mt-1.5"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </label>
              <div className="md:col-span-2 xl:col-span-5 flex justify-end">
                <Button type="submit" variant="accent">
                  Save budget line
                </Button>
              </div>
            </form>
            <p className="mt-3 text-xs text-[#9aa4a8]">
              Demo entries are stored in this browser. Official budget approval and versioning
              require the live workflow.
            </p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Budget lines</CardTitle>
            <p className="mt-1 text-xs text-[#909ba2]">FY {data.fiscalYear} · General Fund</p>
          </div>
          <SearchField value={query} onChange={setQuery} placeholder="Search budget lines..." />
        </CardHeader>
        <div className="odc-scrollbar overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Account</th>
                <th className={thClass}>Category</th>
                <th className={`${thClass} text-right`}>Appropriation</th>
                <th className={`${thClass} text-right`}>Obligated</th>
                <th className={`${thClass} text-right`}>Available</th>
                <th className={thClass}>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((line) => {
                const committed = committedForLine(data, line.id);
                const usage = line.appropriation
                  ? Math.min(100, (committed / line.appropriation) * 100)
                  : 0;
                return (
                  <tr key={line.id} className="hover:bg-[#fdfaf7]">
                    <td className={tdClass}>
                      <div className="font-bold text-[#2d4352]">{line.name}</div>
                      <div className="mt-0.5 text-[10px] text-[#9ba6ad]">{line.code}</div>
                    </td>
                    <td className={tdClass}>{line.category}</td>
                    <td className={`${tdClass} money text-right font-semibold text-[#3e5362]`}>
                      {formatMoney(line.appropriation)}
                    </td>
                    <td className={`${tdClass} money text-right`}>{formatMoney(committed)}</td>
                    <td className={`${tdClass} money text-right font-bold text-[#2b7859]`}>
                      {formatMoney(availableForLine(data, line.id))}
                    </td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#ecefeb]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${usage}%`, backgroundColor: line.color }}
                          />
                        </div>
                        <span className="text-[11px]">{Math.round(usage)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="p-8 text-center text-sm text-[#88959d]">
              No budget lines match your search.
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
