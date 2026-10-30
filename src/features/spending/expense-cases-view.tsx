"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PageLink as Link } from "@/components/layout/page-access-provider";
import { ArrowRight, Check, ChevronRight, Plus, X } from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import { availableForLine, parseMoney } from "@/domain/finance";
import { expenseKinds, kindLabel, type ExpenseKind } from "@/domain/types";
import { displayDate, formatMoney } from "@/lib/utils";
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

const stages = ["PR", "RFQ", "PO", "AIR", "Ready for DV"] as const;

export function ExpenseCasesView({ kind }: { kind?: ExpenseKind }) {
  const { data, createCase, advanceCase, createVoucher } = useFinance();
  const actions = usePendingAction();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [formKind, setFormKind] = useState<ExpenseKind>(kind ?? "procurement");
  const [purpose, setPurpose] = useState("");
  const [payee, setPayee] = useState("");
  const [budgetLineId, setBudgetLineId] = useState(data.budgetLines[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  useEffect(() => {
    if (kind) setFormKind(kind);
  }, [kind]);
  const cases = data.expenseCases.filter(
    (item) =>
      (!kind || item.kind === kind) &&
      `${item.reference} ${item.purpose} ${item.payee}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = parseMoney(amount);
    if (cents === null) return;
    const result = await createCase({
      kind: formKind,
      purpose,
      payee,
      budgetLineId,
      amount: cents,
    });
    if (result.ok) {
      setOpen(false);
      setPurpose("");
      setPayee("");
      setAmount("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="SPENDING WORKFLOWS"
        title={kind ? kindLabel[kind] : "Expense cases"}
        description={
          kind === "procurement"
            ? "Follow each request from PR through RFQ, PO and inspection before preparing a voucher."
            : "Create an expense case, track its source documents, and prepare a linked disbursement voucher."
        }
        action={
          <Button variant="accent" onClick={() => setOpen(!open)}>
            <Plus size={16} /> New {kind ? kindLabel[kind].toLowerCase() : "expense case"}
          </Button>
        }
      />
      <ActionError error={actions.error} />
      {kind === "procurement" && (
        <Card className="mb-6 border-border bg-brand-soft">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-warning">
              Procurement document path
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {stages.map((stage, index) => (
                <div key={stage} className="flex items-center gap-2">
                  <span className="rounded-lg border border-warning/30 bg-card px-3 py-2 text-xs font-bold text-secondary">
                    {stage}
                  </span>
                  {index < stages.length - 1 && (
                    <ChevronRight size={14} className="text-brand-ink" />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              This demo advances document stages. Required quotations, approvals, and inspection
              evidence are specified in the implementation plan for the live workflow.
            </p>
          </CardContent>
        </Card>
      )}
      {open && (
        <Card className="mb-6 border-warning/30">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Create expense case</CardTitle>
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
              pendingLabel="Creating expense case…"
              onSubmit={submit}
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              <label className="text-xs font-semibold text-secondary">
                Expense type
                <select
                  value={formKind}
                  disabled={!!kind}
                  onChange={(event) => setFormKind(event.target.value as ExpenseKind)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm disabled:bg-muted"
                >
                  {expenseKinds.map((item) => (
                    <option key={item} value={item}>
                      {kindLabel[item]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-secondary">
                Payee / recipient
                <Input
                  className="mt-1.5"
                  value={payee}
                  onChange={(event) => setPayee(event.target.value)}
                  placeholder="Name or organization"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                Amount (₱)
                <Input
                  className="mt-1.5"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-secondary sm:col-span-2">
                Purpose
                <Input
                  className="mt-1.5"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  placeholder="Describe what this expense is for"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                Budget line
                <select
                  value={budgetLineId}
                  onChange={(event) => setBudgetLineId(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                >
                  {data.budgetLines.map((line) => (
                    <option value={line.id} key={line.id}>
                      {line.code} · {line.name}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                  Available: {formatMoney(availableForLine(data, budgetLineId))}
                </span>
              </label>
              <div className="flex justify-end sm:col-span-2 xl:col-span-3">
                <Button variant="accent" type="submit">
                  Create case
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{kind ? `${kindLabel[kind]} records` : "All expense cases"}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {cases.length} records · FY {data.fiscalYear}
            </p>
          </div>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search by reference, purpose or payee..."
          />
        </CardHeader>
        <div className="odc-scrollbar overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Reference / purpose</th>
                <th className={thClass}>Source</th>
                <th className={thClass}>Payee</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Stage</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={`${thClass} text-right`}>Next action</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id} className="hover:bg-accent">
                  <td className={tdClass}>
                    <div className="font-bold text-foreground">{item.reference}</div>
                    <div className="mt-0.5 max-w-[220px] truncate text-[11px] text-muted-foreground">
                      {item.purpose}
                    </div>
                  </td>
                  <td className={tdClass}>{kindLabel[item.kind]}</td>
                  <td className={tdClass}>{item.payee}</td>
                  <td className={tdClass}>{displayDate(item.date)}</td>
                  <td className={tdClass}>
                    <StatusBadge status={item.step} />
                  </td>
                  <td className={`${tdClass} money text-right font-bold text-foreground`}>
                    {formatMoney(item.amount)}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    {item.voucherId ? (
                      <Link
                        className="inline-flex items-center gap-1 font-bold text-brand-ink hover:underline"
                        href="/disbursements"
                      >
                        View DV <ArrowRight size={13} />
                      </Link>
                    ) : item.step === "Ready for DV" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={actions.pending === `voucher:${item.id}`}
                        loadingText="Creating…"
                        disabled={actions.pending !== null}
                        onClick={() =>
                          actions.run(`voucher:${item.id}`, () => createVoucher(item.id))
                        }
                      >
                        Create DV
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={actions.pending === `advance:${item.id}`}
                        loadingText="Updating…"
                        disabled={actions.pending !== null}
                        onClick={() =>
                          actions.run(`advance:${item.id}`, () => advanceCase(item.id))
                        }
                      >
                        Complete {item.step} <Check size={13} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cases.length && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No expense cases match this view.
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
