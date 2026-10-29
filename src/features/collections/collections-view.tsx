"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Plus, ReceiptText, X } from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import { dashboardTotals, parseMoney, receiptUnmatched } from "@/domain/finance";
import { displayDate, formatMoney } from "@/lib/utils";
import { useConfirm } from "@/components/layout/confirm-provider";
import { usePendingAction } from "@/hooks/use-pending-action";
import { ActionError, Form } from "@/components/ui/form";
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
  const confirm = useConfirm();
  const actions = usePendingAction();
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = parseMoney(amount);
    if (cents === null) return;
    const result = await createCollection({ payer, purpose, revenueCategory, amount: cents });
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
      <ActionError error={actions.error} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Collected to date", value: totals.collected, color: "var(--brand-ink)" },
          { label: "Deposited", value: totals.deposited, color: "var(--success)" },
          { label: "Remitted", value: totals.remitted, color: "var(--violet)" },
          { label: "Awaiting matching", value: totals.undeposited, color: "var(--info)" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">{item.label}</div>
                <div className="money mt-2 text-[23px] font-bold text-foreground">
                  {formatMoney(item.value)}
                </div>
              </div>
              <div
                className="h-9 w-9 rounded-lg"
                style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)` }}
              >
                <ReceiptText size={17} className="m-[10px]" style={{ color: item.color }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {open && (
        <Card className="mb-6 border-warning/30">
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
            <Form
              pendingLabel="Issuing receipt…"
              onSubmit={submit}
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              <label className="text-xs font-semibold text-secondary">
                Payer
                <Input
                  className="mt-1.5"
                  value={payer}
                  onChange={(event) => setPayer(event.target.value)}
                  placeholder="Full name"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                Revenue category
                <select
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                  value={revenueCategory}
                  onChange={(event) => setRevenueCategory(event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-secondary">
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
              <label className="text-xs font-semibold text-secondary sm:col-span-2 xl:col-span-3">
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
            </Form>
            <p className="mt-3 text-xs text-muted-foreground">
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
            <p className="mt-1 text-xs text-muted-foreground">
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
                <tr key={item.id} className="hover:bg-accent">
                  <td className={tdClass}>
                    <div className="font-bold text-foreground">{item.receiptNumber}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{item.payer}</div>
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
                          className="text-danger"
                          loading={actions.pending === item.id}
                          loadingText="Voiding…"
                          disabled={actions.pending !== null}
                          onClick={async () => {
                            if (
                              await confirm({
                                title: "Void receipt?",
                                description: `Void receipt ${item.receiptNumber}?`,
                                confirmLabel: "Void receipt",
                                destructive: true,
                              })
                            )
                              await actions.run(item.id, () => voidCollection(item.id));
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
            <p className="p-8 text-center text-sm text-muted-foreground">
              No receipts match your search.
            </p>
          )}
        </div>
        <div className="flex justify-end border-t border-border p-4">
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
