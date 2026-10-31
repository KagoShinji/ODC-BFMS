"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, BookOpen, Wallet } from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import { PdfButton } from "@/components/financial/pdf-button";
import { advanceDocument, advanceRegister } from "@/features/reports/financial-documents";
import { dashboardTotals, parseMoney } from "@/domain/finance";
import type { LiquidationEntry } from "@/domain/types";
import { displayDate, formatMoney } from "@/lib/utils";
import { usePendingAction } from "@/hooks/use-pending-action";
import { ActionError, Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeading, tableClass, tdClass, thClass } from "@/components/financial/shared";

export function AdvancesView() {
  const { data, openAdvance, recordLiquidation } = useFinance();
  const actions = usePendingAction();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kind, setKind] = useState<LiquidationEntry["kind"]>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const untracked = data.vouchers.filter(
    (item) =>
      item.kind === "travel" &&
      item.status === "paid" &&
      !data.cashAdvances.some((advance) => advance.voucherId === item.id),
  );
  const selected = data.cashAdvances.find((item) => item.id === selectedId);
  const entries = data.liquidationEntries.filter((item) => item.advanceId === selectedId);
  const outstanding = selected
    ? selected.amount - entries.reduce((sum, item) => sum + item.amount, 0)
    : 0;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const cents = parseMoney(amount);
    if (cents === null) return;
    const result = await recordLiquidation({
      advanceId: selected.id,
      kind,
      description,
      amount: cents,
    });
    if (result.ok) {
      setDescription("");
      setAmount("");
    }
  }
  const totals = dashboardTotals(data);
  return (
    <>
      <PageHeading
        eyebrow="SPENDING · ACCOUNTABILITY"
        title="Cash advances & liquidation"
        description="Track travel advances, accepted expenses, refunds, and the balance each accountable person must settle."
        action={<PdfButton documents={[advanceRegister(data)]} />}
      />
      <ActionError error={actions.error} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                Outstanding advances
              </div>
              <div className="money mt-2 text-[23px] font-bold text-foreground">
                {formatMoney(totals.advanceOutstanding)}
              </div>
            </div>
            <Wallet size={20} className="text-brand-ink" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-xs font-semibold text-muted-foreground">Open records</div>
              <div className="money mt-2 text-[23px] font-bold text-foreground">
                {
                  data.cashAdvances.filter(
                    (advance) =>
                      advance.amount >
                      data.liquidationEntries
                        .filter((entry) => entry.advanceId === advance.id)
                        .reduce((sum, entry) => sum + entry.amount, 0),
                  ).length
                }
              </div>
            </div>
            <BookOpen size={20} className="text-brand-ink" />
          </CardContent>
        </Card>
      </div>
      {untracked.length > 0 && (
        <Card className="mb-6 border-warning/30 bg-brand-soft">
          <CardHeader>
            <CardTitle>Paid travel vouchers eligible for an advance</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Open an advance only when this voucher represents cash given to an accountable person.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {untracked.map((voucher) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                key={voucher.id}
              >
                <div className="text-xs">
                  <div className="font-bold text-secondary">
                    {voucher.number} · {voucher.payee}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {voucher.purpose} · {formatMoney(voucher.amount)}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={actions.pending === voucher.id}
                  loadingText="Opening…"
                  disabled={actions.pending !== null}
                  onClick={() => actions.run(voucher.id, () => openAdvance(voucher.id))}
                >
                  Open advance <ArrowRight size={14} />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Advance register</CardTitle>
        </CardHeader>
        <div className="odc-scrollbar overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Voucher</th>
                <th className={thClass}>Accountable person</th>
                <th className={thClass}>Opened</th>
                <th className={`${thClass} text-right`}>Advance</th>
                <th className={`${thClass} text-right`}>Settled</th>
                <th className={`${thClass} text-right`}>Outstanding</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {data.cashAdvances.map((advance) => {
                const settled = data.liquidationEntries
                  .filter((entry) => entry.advanceId === advance.id)
                  .reduce((sum, entry) => sum + entry.amount, 0);
                return (
                  <tr key={advance.id} className="hover:bg-accent">
                    <td className={`${tdClass} font-bold text-foreground`}>
                      {data.vouchers.find((item) => item.id === advance.voucherId)?.number ?? "—"}
                    </td>
                    <td className={tdClass}>{advance.accountablePerson}</td>
                    <td className={tdClass}>{displayDate(advance.openedAt)}</td>
                    <td className={`${tdClass} money text-right`}>{formatMoney(advance.amount)}</td>
                    <td className={`${tdClass} money text-right`}>{formatMoney(settled)}</td>
                    <td className={`${tdClass} money text-right font-bold text-warning`}>
                      {formatMoney(advance.amount - settled)}
                    </td>
                    <td className={tdClass}>
                      <PdfButton documents={[advanceDocument(data, advance)]} label="PDF" />
                      <Button variant="ghost" size="sm" onClick={() => setSelectedId(advance.id)}>
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!data.cashAdvances.length && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No cash advances have been opened.
            </p>
          )}
        </div>
      </Card>
      {selected && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Liquidation · {selected.accountablePerson}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Remaining: {formatMoney(outstanding)} · Voucher{" "}
              {data.vouchers.find((item) => item.id === selected.voucherId)?.number}
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-5 space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-secondary">
                      {entry.kind === "refund" ? "Refund" : "Accepted expense"}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {entry.description} · {displayDate(entry.date)}
                    </span>
                  </div>
                  <span className="money font-bold text-secondary">
                    {formatMoney(entry.amount)}
                  </span>
                </div>
              ))}
              {!entries.length && (
                <p className="rounded-lg bg-muted p-4 text-xs text-muted-foreground">
                  No liquidation entries yet.
                </p>
              )}
            </div>
            {outstanding > 0 && (
              <Form
                pendingLabel="Recording entry…"
                onSubmit={submit}
                className="grid gap-4 sm:grid-cols-4"
              >
                <label className="text-xs font-semibold text-secondary">
                  Entry type
                  <select
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    value={kind}
                    onChange={(event) => setKind(event.target.value as LiquidationEntry["kind"])}
                  >
                    <option value="expense">Accepted expense</option>
                    <option value="refund">Cash refund</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-secondary sm:col-span-2">
                  Description / evidence reference
                  <Input
                    className="mt-1.5"
                    required
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Receipt or deposit reference"
                  />
                </label>
                <label className="text-xs font-semibold text-secondary">
                  Amount (₱)
                  <Input
                    className="mt-1.5"
                    required
                    type="number"
                    min="0.01"
                    max={(outstanding / 100).toFixed(2)}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </label>
                <div className="flex justify-end sm:col-span-4">
                  <Button variant="accent" type="submit">
                    Record demo entry
                  </Button>
                </div>
              </Form>
            )}
            {outstanding === 0 && (
              <p className="rounded-lg bg-success-soft p-3 text-xs font-semibold text-success">
                This advance is fully settled.
              </p>
            )}
            <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
              Demo entries show the balance effect. Official liquidation requires supporting
              evidence, review, approval and accounting validation.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
