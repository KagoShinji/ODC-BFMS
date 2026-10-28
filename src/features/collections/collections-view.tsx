"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Plus, ReceiptText, X } from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import { dashboardTotals, parseMoney, receiptUnmatched } from "@/domain/finance";
import { displayDate, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PageHeading,
  SearchField,
  StatusBadge,
  tableClass,
  tdClass,
  thClass,
} from "@/components/financial/shared";

const categories = [
  "Clearance fees",
  "Certification fees",
  "Other income",
  "Barangay aid",
  "Permit fees",
];

export function CollectionsView() {
  const { data, createCollection, voidCollection } = useFinance();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [payer, setPayer] = useState("");
  const [purpose, setPurpose] = useState("");
  const [revenueCategory, setRevenueCategory] = useState(categories[0]);
  const [amount, setAmount] = useState("");
  const totals = dashboardTotals(data);
  const rows = data.collections.filter((item) =>
    `${item.receiptNumber} ${item.payer} ${item.purpose}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = parseMoney(amount);
    if (cents === null) return;
    const result = createCollection({ payer, purpose, revenueCategory, amount: cents });
    if (result.ok) {
      setOpen(false);
      setPayer("");
      setPurpose("");
      setAmount("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="REVENUE · COLLECTIONS"
        title="Collections & receipts"
        description="Record every collection with a traceable receipt and keep undeposited amounts visible."
        action={
          <Button variant="accent" onClick={() => setOpen(!open)}>
            <Plus size={16} /> Record collection
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Collected to date", value: totals.collected, color: "#f56618" },
          { label: "Deposited", value: totals.deposited, color: "#5b8d72" },
          { label: "Remitted", value: totals.remitted, color: "#796a9e" },
          { label: "Awaiting matching", value: totals.undeposited, color: "#5b829b" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <div className="text-xs font-semibold text-[#85939c]">{item.label}</div>
                <div className="money mt-2 text-[23px] font-bold text-[#203747]">
                  {formatMoney(item.value)}
                </div>
              </div>
              <div className="h-9 w-9 rounded-lg" style={{ background: `${item.color}20` }}>
                <ReceiptText size={17} className="m-[10px]" style={{ color: item.color }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {open && (
        <Card className="mb-6 border-[#ffc59d]">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>New collection</CardTitle>
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
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <label className="text-xs font-semibold text-[#526575]">
                Payer
                <Input
                  className="mt-1.5"
                  value={payer}
                  onChange={(event) => setPayer(event.target.value)}
                  placeholder="Full name"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-[#526575]">
                Revenue category
                <select
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#d9dedf] bg-white px-3 text-sm"
                  value={revenueCategory}
                  onChange={(event) => setRevenueCategory(event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-[#526575]">
                Amount (₱)
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
              <label className="text-xs font-semibold text-[#526575] sm:col-span-2 xl:col-span-3">
                Purpose / particulars
                <Input
                  className="mt-1.5"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  placeholder="e.g. Barangay clearance"
                  required
                />
              </label>
              <div className="flex justify-end sm:col-span-2 xl:col-span-3">
                <Button type="submit" variant="accent">
                  Issue demo receipt
                </Button>
              </div>
            </form>
            <p className="mt-3 text-xs text-[#9aa5aa]">
              Official receipt series, accountable forms and collector permissions are configured in
              the live workflow.
            </p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Receipt register</CardTitle>
            <p className="mt-1 text-xs text-[#96a1a7]">
              Issued and voided receipts remain visible.
            </p>
          </div>
          <SearchField value={query} onChange={setQuery} placeholder="Search receipts..." />
        </CardHeader>
        <div className="odc-scrollbar overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Receipt / payer</th>
                <th className={thClass}>Purpose</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={`${thClass} text-right`}>Unmatched</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="hover:bg-[#fdfaf7]">
                  <td className={tdClass}>
                    <div className="font-bold text-[#2d4352]">{item.receiptNumber}</div>
                    <div className="mt-0.5 text-[11px] text-[#91a0a7]">{item.payer}</div>
                  </td>
                  <td className={tdClass}>{item.purpose}</td>
                  <td className={tdClass}>{item.revenueCategory}</td>
                  <td className={tdClass}>{displayDate(item.date)}</td>
                  <td className={tdClass}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className={`${tdClass} money text-right font-semibold`}>
                    {formatMoney(item.amount)}
                  </td>
                  <td className={`${tdClass} money text-right`}>
                    {formatMoney(receiptUnmatched(data, item.id))}
                  </td>
                  <td className={tdClass}>
                    {item.status === "issued" &&
                      receiptUnmatched(data, item.id) === item.amount && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#ad5a4d]"
                          onClick={() => {
                            if (window.confirm(`Void demo receipt ${item.receiptNumber}?`))
                              voidCollection(item.id);
                          }}
                        >
                          Void
                        </Button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="p-8 text-center text-sm text-[#8d999f]">No receipts match your search.</p>
          )}
        </div>
        <div className="flex justify-end border-t border-[#edf0ee] p-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/deposits">
              Match deposits <ArrowRight size={14} />
            </Link>
          </Button>
        </div>
      </Card>
    </>
  );
}
