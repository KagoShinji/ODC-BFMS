"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Banknote, Check, FileText, Plus, X } from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import { availableForLine } from "@/domain/finance";
import { kindLabel } from "@/domain/types";
import { displayDate, formatMoney } from "@/lib/utils";
import { usePendingAction } from "@/hooks/use-pending-action";
import { ActionError } from "@/components/ui/form";
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

export function DisbursementsView() {
  const router = useRouter();
  const actions = usePendingAction();
  const searchParams = useSearchParams();
  const { data, submitVoucher, approveVoucher, rejectVoucher, recordPayment } = useFinance();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  useEffect(() => {
    setSelectedId(searchParams.get("selected"));
  }, [searchParams]);
  function closeVoucher() {
    setSelectedId(null);
    if (searchParams.has("selected")) router.replace("/disbursements", { scroll: false });
  }
  const selected = data.vouchers.find((item) => item.id === selectedId);
  const rows = data.vouchers.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      `${item.number} ${item.payee} ${item.purpose}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function pay() {
    if (!selected) return;
    await actions.run("payment", async () => {
      const result = await recordPayment(selected.id, paymentReference);
      if (result.ok) setPaymentReference("");
    });
  }
  return (
    <>
      <PageHeading
        eyebrow="SPENDING · DISBURSEMENT"
        title="Disbursement vouchers"
        description="Review supporting cases, check budget coding, approve, and record authorized payments."
        action={
          <Button asChild variant="accent">
            <Link href="/spending">
              <Plus size={16} /> New expense case
            </Link>
          </Button>
        }
      />
      <ActionError error={actions.error} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "For review",
            value: data.vouchers.filter((item) => item.status === "submitted").length,
            color: "var(--warning)",
          },
          {
            label: "Ready for payment",
            value: data.vouchers.filter((item) => item.status === "approved").length,
            color: "var(--success)",
          },
          {
            label: "Paid vouchers",
            value: data.vouchers.filter((item) => item.status === "paid").length,
            color: "var(--info)",
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-[12px] font-semibold text-muted-foreground">{item.label}</div>
                <div className="money mt-1 text-2xl font-bold text-foreground">{item.value}</div>
              </div>
              <div className="h-10 w-1 rounded-full" style={{ backgroundColor: item.color }} />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Voucher register</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Select a voucher to view its linked source and next action.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SearchField value={query} onChange={setQuery} placeholder="Search vouchers..." />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by status"
              className="h-10 rounded-lg border border-border bg-card px-3 text-xs text-secondary"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </CardHeader>
        <div className="odc-scrollbar overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Voucher / purpose</th>
                <th className={thClass}>Payee</th>
                <th className={thClass}>Source</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className="cursor-pointer hover:bg-accent"
                >
                  <td className={tdClass}>
                    <div className="font-bold text-foreground">{item.number}</div>
                    <div className="mt-0.5 max-w-[220px] truncate text-[11px] text-muted-foreground">
                      {item.purpose}
                    </div>
                  </td>
                  <td className={tdClass}>{item.payee}</td>
                  <td className={tdClass}>{kindLabel[item.kind]}</td>
                  <td className={tdClass}>{displayDate(item.date)}</td>
                  <td className={tdClass}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className={`${tdClass} money text-right font-bold text-foreground`}>
                    {formatMoney(item.amount)}
                  </td>
                  <td className={tdClass}>
                    <ArrowRight size={15} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No vouchers match your filters.
            </p>
          )}
        </div>
      </Card>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeVoucher();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Voucher ${selected.number}`}
            className="odc-scrollbar h-full w-full max-w-[520px] overflow-y-auto bg-card p-5 shadow-xl sm:p-7"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-brand-ink">
                  DISBURSEMENT VOUCHER
                </div>
                <h2 className="mt-2 text-2xl font-bold text-foreground">{selected.number}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={closeVoucher} aria-label="Close voucher">
                <X size={20} />
              </Button>
            </div>
            <div className="mt-4">
              <StatusBadge status={selected.status} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-5 rounded-xl bg-muted p-5">
              <div>
                <div className="text-[11px] text-muted-foreground">Payee</div>
                <div className="mt-1 text-sm font-bold text-foreground">{selected.payee}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Amount</div>
                <div className="money mt-1 text-lg font-bold text-foreground">
                  {formatMoney(selected.amount)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Date</div>
                <div className="mt-1 text-sm font-semibold">{displayDate(selected.date)}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Source type</div>
                <div className="mt-1 text-sm font-semibold">{kindLabel[selected.kind]}</div>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Purpose
                </div>
                <p className="mt-1 text-sm text-secondary">{selected.purpose}</p>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Source document
                </div>
                <p className="mt-1 text-sm font-semibold text-secondary">
                  {data.expenseCases.find((item) => item.id === selected.sourceCaseId)?.reference ??
                    "—"}
                </p>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Budget line
                </div>
                <p className="mt-1 text-sm font-semibold text-secondary">
                  {data.budgetLines.find((line) => line.id === selected.budgetLineId)?.name ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Available to commit: {formatMoney(availableForLine(data, selected.budgetLineId))}
                </p>
              </div>
              {selected.paymentReference && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Payment reference
                  </div>
                  <p className="mt-1 text-sm font-semibold text-secondary">
                    {selected.paymentReference}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-8 border-t border-border pt-5">
              <div className="mb-3 text-xs font-bold text-secondary">Next action</div>
              <ActionError error={actions.error} />
              {selected.status === "draft" && (
                <Button
                  variant="accent"
                  className="w-full"
                  loading={actions.pending === "submit"}
                  loadingText="Submitting…"
                  disabled={actions.pending !== null}
                  onClick={() => actions.run("submit", () => submitVoucher(selected.id))}
                >
                  Submit for review <ArrowRight size={16} />
                </Button>
              )}
              {selected.status === "submitted" && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    loading={actions.pending === "reject"}
                    loadingText="Rejecting…"
                    disabled={actions.pending !== null}
                    onClick={() => actions.run("reject", () => rejectVoucher(selected.id))}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="accent"
                    loading={actions.pending === "approve"}
                    loadingText="Approving…"
                    disabled={actions.pending !== null}
                    onClick={() => actions.run("approve", () => approveVoucher(selected.id))}
                  >
                    <Check size={15} /> Approve
                  </Button>
                </div>
              )}
              {selected.status === "approved" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-secondary">
                    Check / payment reference
                    <Input
                      className="mt-1.5"
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder="e.g. CHK-00188"
                    />
                  </label>
                  <Button
                    className="w-full"
                    loading={actions.pending === "payment"}
                    loadingText="Recording payment…"
                    disabled={actions.pending !== null}
                    onClick={pay}
                  >
                    <Banknote size={15} /> Record payment
                  </Button>
                </div>
              )}
              {selected.status === "paid" && (
                <p className="rounded-lg bg-success-soft p-3 text-xs text-success">
                  Payment recorded on {displayDate(selected.paidAt ?? selected.date)}.
                </p>
              )}
              {selected.status === "rejected" && (
                <p className="rounded-lg bg-danger-soft p-3 text-xs text-danger">
                  This demo voucher was rejected. Create a new expense case to revise the request.
                </p>
              )}
            </div>
            <div className="mt-5 rounded-lg border border-border p-3 text-[11px] leading-5 text-muted-foreground">
              Demo approval and payment actions illustrate the workflow. Production permissions,
              evidence and posting controls are defined in the implementation plan.
            </div>
          </section>
        </div>
      )}
    </>
  );
}
