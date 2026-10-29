"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Landmark, Plus, X } from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import type { Deposit } from "@/domain/types";
import { parseMoney, receiptUnmatched } from "@/domain/finance";
import { displayDate, formatMoney } from "@/lib/utils";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PageHeading,
  StatusBadge,
  tableClass,
  tdClass,
  thClass,
} from "@/components/financial/shared";

export function DepositsView() {
  const { data, createDeposit } = useFinance();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Deposit["kind"]>("deposit");
  const [bank, setBank] = useState("Land Bank");
  const [reference, setReference] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const unmatched = data.collections.filter((item) => receiptUnmatched(data, item.id) > 0);
  const allocationEntries = Object.entries(selected).filter(([, value]) => value !== "");
  const selectedAmount = allocationEntries.reduce(
    (sum, [, value]) => sum + (parseMoney(value) ?? 0),
    0,
  );
  function toggle(id: string, amount: number) {
    setSelected((current) => {
      const next = { ...current };
      if (next[id] !== undefined) delete next[id];
      else next[id] = (amount / 100).toFixed(2);
      return next;
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const allocations = allocationEntries.map(([collectionId, amount]) => ({
      collectionId,
      amount: parseMoney(amount) ?? 0,
    }));
    const result = await createDeposit({ kind, bank, reference, allocations });
    if (result.ok) {
      setOpen(false);
      setSelected({});
      setReference("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="REVENUE · TREASURY"
        title="Deposits & remittances"
        description="Allocate issued receipts to a bank deposit or treasury remittance and see every unmatched balance."
        action={
          <Button variant="accent" onClick={() => setOpen(!open)}>
            <Plus size={16} /> New matching batch
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Unmatched receipts", value: unmatched.length },
          {
            label: "Awaiting matching",
            value: formatMoney(
              unmatched.reduce((sum, item) => sum + receiptUnmatched(data, item.id), 0),
            ),
          },
          { label: "Confirmed batches", value: data.deposits.length },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">{item.label}</div>
                <div className="money mt-2 text-[23px] font-bold text-foreground">{item.value}</div>
              </div>
              <Landmark size={19} className="text-brand-ink" />
            </CardContent>
          </Card>
        ))}
      </div>
      {open && (
        <Card className="mb-6 border-warning/30">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Match a new deposit or remittance</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Select receipts and adjust allocations for a partial amount.
              </p>
            </div>
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
            <Form pendingLabel="Confirming batch…" onSubmit={submit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-xs font-semibold text-secondary">
                  Transaction type
                  <select
                    value={kind}
                    onChange={(event) => setKind(event.target.value as Deposit["kind"])}
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                  >
                    <option value="deposit">Bank deposit</option>
                    <option value="remittance">Treasury remittance</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-secondary">
                  {kind === "deposit" ? "Depository bank" : "Remittance recipient"}
                  <Input
                    className="mt-1.5"
                    value={bank}
                    onChange={(event) => setBank(event.target.value)}
                    required
                  />
                </label>
                <label className="text-xs font-semibold text-secondary">
                  Reference / acknowledgement
                  <Input
                    className="mt-1.5"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="e.g. LBP-827411"
                    required
                  />
                </label>
              </div>
              <div>
                <div className="mb-2 text-xs font-bold text-secondary">Unmatched receipts</div>
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {unmatched.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          className="accent-brand"
                          type="checkbox"
                          checked={selected[item.id] !== undefined}
                          onChange={() => toggle(item.id, receiptUnmatched(data, item.id))}
                        />
                        <span className="text-xs">
                          <span className="font-bold text-foreground">{item.receiptNumber}</span>
                          <span className="ml-2 text-muted-foreground">{item.payer}</span>
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="money text-xs text-muted-foreground">
                          of {formatMoney(receiptUnmatched(data, item.id))}
                        </span>
                        {selected[item.id] !== undefined && (
                          <Input
                            aria-label={`Allocation for ${item.receiptNumber} in pesos`}
                            className="w-28 text-right"
                            type="number"
                            min="0.01"
                            max={(receiptUnmatched(data, item.id) / 100).toFixed(2)}
                            step="0.01"
                            value={selected[item.id]}
                            onChange={(event) =>
                              setSelected((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {!unmatched.length && (
                    <p className="rounded-lg bg-muted p-4 text-xs text-muted-foreground">
                      All issued receipts are matched.{" "}
                      <Link href="/collections" className="text-brand-ink hover:underline">
                        Record a collection
                      </Link>{" "}
                      first.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <div>
                  <div className="text-[11px] text-muted-foreground">Batch total</div>
                  <div className="money text-xl font-bold text-foreground">
                    {formatMoney(selectedAmount)}
                  </div>
                </div>
                <Button type="submit" variant="accent" disabled={!allocationEntries.length}>
                  Confirm demo batch <ArrowRight size={15} />
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Matching register</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Deposits and remittances settle collected cash. Only bank deposits increase cash in
            bank.
          </p>
        </CardHeader>
        <div className="odc-scrollbar overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Reference</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Destination / evidence</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Receipts matched</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.deposits.map((item) => (
                <tr key={item.id} className="hover:bg-accent">
                  <td className={`${tdClass} font-bold text-foreground`}>{item.number}</td>
                  <td className={tdClass}>
                    {item.kind === "deposit" ? "Bank deposit" : "Remittance"}
                  </td>
                  <td className={tdClass}>
                    {item.bank}
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{item.reference}</div>
                  </td>
                  <td className={tdClass}>{displayDate(item.date)}</td>
                  <td className={tdClass}>
                    {item.allocations
                      .map(
                        (allocation) =>
                          data.collections.find(
                            (collection) => collection.id === allocation.collectionId,
                          )?.receiptNumber,
                      )
                      .join(", ")}
                  </td>
                  <td className={tdClass}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className={`${tdClass} money text-right font-bold text-foreground`}>
                    {formatMoney(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
