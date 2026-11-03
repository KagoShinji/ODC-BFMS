"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Landmark, Plus, X } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/ui/table-pagination";
import { PageLink as Link } from "@/components/layout/page-access-provider";
import { useFinance } from "@/data/demo/finance-provider";
import { PdfButton } from "@/components/financial/pdf-button";
import { depositDocument, depositRegister } from "@/features/reports/financial-documents";
import type { Deposit } from "@/domain/types";
import { parseMoney } from "@/domain/finance";
import { receiptMatching } from "@/domain/matching";
import { displayDate, formatMoney } from "@/lib/utils";
import { Form } from "@/components/ui/form";
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
import { MatchingStatus } from "./matching-status";
import { BatchDetails } from "./batch-details";

export function DepositsView() {
  const { data, createDeposit, preview, liveRecording } = useFinance();
  const canRecord = !preview || liveRecording;
  const pagination = usePagination(data.deposits, JSON.stringify([data.barangay]));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<Deposit["kind"]>("deposit");
  const [bank, setBank] = useState("Land Bank");
  const [reference, setReference] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [receiptFilter, setReceiptFilter] = useState("outstanding");
  const [focusReceipt, setFocusReceipt] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; amount: number; kind: Deposit["kind"] } | null>(
    null,
  );
  const formRef = useRef<HTMLDivElement>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const matches = useMemo(() => receiptMatching(data), [data]);
  const progress = useMemo(
    () => new Map(matches.map((item) => [item.receipt.id, item])),
    [matches],
  );
  const unmatched = matches.filter((item) => item.remaining > 0);
  const receiptRows = matches.filter(
    (item) =>
      (receiptFilter === "all" ||
        (receiptFilter === "matched" ? item.remaining === 0 : item.remaining > 0)) &&
      `${item.receipt.receiptNumber} ${item.receipt.payer} ${item.receipt.purpose}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const receiptPagination = usePagination(
    receiptRows,
    JSON.stringify([data.barangay, query, receiptFilter]),
  );
  const allocationEntries = Object.entries(selected);
  const selectedAmount = allocationEntries.reduce(
    (sum, [, value]) => sum + (parseMoney(value) ?? 0),
    0,
  );
  const validSelection =
    allocationEntries.length > 0 &&
    Number.isSafeInteger(selectedAmount) &&
    allocationEntries.every(([id, value]) => {
      const amount = parseMoney(value);
      return amount !== null && amount <= (progress.get(id)?.remaining ?? 0);
    });
  const savedBatch = saved ? data.deposits.find((item) => item.id === saved.id) : undefined;

  useEffect(() => {
    if (!open || !focusReceipt) return;
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    inputs.current[focusReceipt]?.focus();
    setFocusReceipt(null);
  }, [open, focusReceipt]);

  function startMatching(id: string) {
    const match = progress.get(id);
    if (!match || match.remaining <= 0 || saving || !canRecord) return;
    setSelected((current) => ({ ...current, [id]: (match.remaining / 100).toFixed(2) }));
    setSaved(null);
    setOpen(true);
    setFocusReceipt(id);
  }
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
    if (!validSelection || saving || !canRecord) return;
    setSaving(true);
    try {
      const allocations = allocationEntries.map(([collectionId, amount]) => ({
        collectionId,
        amount: parseMoney(amount)!,
      }));
      const result = await createDeposit({ kind, bank, reference, allocations });
      if (result.ok) {
        pagination.setPage(1);
        if (result.id) setSaved({ id: result.id, amount: selectedAmount, kind });
        setOpen(false);
        setSelected({});
        setReference("");
      }
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="REVENUE · TREASURY"
        title="Deposits & remittances"
        description="Record where collected money goes and track the remaining balance of each receipt."
        action={
          <>
            <PdfButton documents={[depositRegister(data)]} />
            <Button
              variant="accent"
              disabled={saving || !canRecord}
              onClick={() => {
                setOpen(!open);
                setSaved(null);
              }}
            >
              <Plus size={16} /> New matching batch
            </Button>
          </>
        }
      />
      {!canRecord && (
        <p className="mb-4 rounded-xl bg-muted p-3 text-xs leading-5 text-muted-foreground">
          You can review receipt matching. Recording new batches is not enabled for your account.
        </p>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Receipts with remaining balances", value: unmatched.length },
          {
            label: "Amount still to match",
            value: formatMoney(unmatched.reduce((sum, item) => sum + item.remaining, 0)),
          },
          { label: "Confirmed batches", value: data.deposits.length },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between gap-3 p-5">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">{item.label}</div>
                <div className="money mt-2 text-[23px] font-bold text-foreground">{item.value}</div>
              </div>
              <Landmark size={19} className="shrink-0 text-brand-ink" aria-hidden="true" />
            </CardContent>
          </Card>
        ))}
      </div>
      {open && canRecord && (
        <Card ref={formRef} className="mb-6 scroll-mt-4 border-warning/30">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Match a new deposit or remittance</CardTitle>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Select receipts and enter the actual amount allocated from each one. Partial amounts
                leave a balance for later.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={saving || !canRecord}
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
                    disabled={saving || !canRecord}
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
                    disabled={saving || !canRecord}
                    onChange={(event) => setBank(event.target.value)}
                    required
                  />
                </label>
                <label className="text-xs font-semibold text-secondary">
                  Reference / acknowledgement
                  <Input
                    className="mt-1.5"
                    value={reference}
                    disabled={saving || !canRecord}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder={
                      kind === "deposit" ? "e.g. LBP-827411" : "Acknowledgement reference"
                    }
                    required
                  />
                </label>
              </div>
              <fieldset disabled={saving || !canRecord}>
                <legend className="mb-2 text-xs font-bold text-secondary">
                  Receipts with remaining balances
                </legend>
                <ul className="max-h-80 space-y-3 overflow-y-auto p-1">
                  {unmatched.map((match) => {
                    const item = match.receipt;
                    const checked = selected[item.id] !== undefined;
                    const amount = checked ? parseMoney(selected[item.id]) : null;
                    const invalid = checked && (amount === null || amount > match.remaining);
                    return (
                      <li
                        key={item.id}
                        className={`rounded-xl border p-3 ${checked ? "border-brand/40 bg-brand-soft" : "border-border bg-card"}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <label className="flex cursor-pointer items-center gap-3 text-xs">
                            <input
                              type="checkbox"
                              className="accent-brand"
                              checked={checked}
                              onChange={() => toggle(item.id, match.remaining)}
                            />
                            <span>
                              <span className="block font-bold text-foreground">
                                {item.receiptNumber}
                              </span>
                              <span className="mt-1 block text-muted-foreground">{item.payer}</span>
                            </span>
                          </label>
                          <MatchingStatus status={match.status} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          <span>
                            Collected{" "}
                            <strong className="money text-secondary">
                              {formatMoney(item.amount)}
                            </strong>
                          </span>
                          <span>
                            Matched{" "}
                            <strong className="money text-secondary">
                              {formatMoney(match.matched)}
                            </strong>
                          </span>
                          <span>
                            Remaining{" "}
                            <strong className="money text-foreground">
                              {formatMoney(match.remaining)}
                            </strong>
                          </span>
                        </div>
                        {checked && (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                            <label className="text-xs font-semibold text-secondary">
                              Allocate in this batch
                              <Input
                                ref={(element) => {
                                  inputs.current[item.id] = element;
                                }}
                                aria-label={`Allocation for ${item.receiptNumber} in pesos`}
                                aria-invalid={invalid || undefined}
                                aria-describedby={`allocation-hint-${item.id}`}
                                className="mt-1.5 w-40 text-right"
                                type="number"
                                min="0.01"
                                max={(match.remaining / 100).toFixed(2)}
                                step="0.01"
                                required
                                value={selected[item.id]}
                                onChange={(event) =>
                                  setSelected((current) => ({
                                    ...current,
                                    [item.id]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <p
                              id={`allocation-hint-${item.id}`}
                              className={`text-xs ${invalid ? "text-danger" : "text-secondary"}`}
                              aria-live="polite"
                            >
                              {invalid ? (
                                `Enter an amount from ₱0.01 to ${formatMoney(match.remaining)}.`
                              ) : (
                                <>
                                  After this batch:{" "}
                                  <strong className="money">
                                    {formatMoney(match.remaining - amount!)}
                                  </strong>{" "}
                                  still to match
                                </>
                              )}
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {!unmatched.length && (
                  <p className="rounded-lg bg-muted p-4 text-xs leading-5 text-muted-foreground">
                    No receipt balances are waiting to be matched.{" "}
                    <Link
                      href="/collections"
                      className="font-semibold text-brand-ink hover:underline"
                    >
                      Open Collections
                    </Link>{" "}
                    to review or record receipts.
                  </p>
                )}
              </fieldset>
              {allocationEntries.length > 0 && !validSelection && (
                <p role="alert" className="text-xs text-danger">
                  Check the selected amounts before confirming. Clear the selection if a receipt
                  balance has changed.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Batch total · {allocationEntries.length} selected{" "}
                    {allocationEntries.length === 1 ? "receipt" : "receipts"}
                  </p>
                  <p className="money mt-1 text-xl font-bold text-foreground">
                    {formatMoney(selectedAmount)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allocationEntries.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={saving || !canRecord}
                      onClick={() => setSelected({})}
                    >
                      Clear selection
                    </Button>
                  )}
                  <Button type="submit" variant="accent" disabled={!validSelection}>
                    Confirm batch <ArrowRight size={15} />
                  </Button>
                </div>
              </div>
            </Form>
          </CardContent>
        </Card>
      )}
      {saved && (
        <section
          aria-label="Matching confirmation"
          className="mb-6 rounded-2xl border border-success/30 bg-success-soft p-4 text-foreground"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
              <div>
                <p role="status" className="text-sm font-bold">
                  {formatMoney(saved.amount)}{" "}
                  {saved.kind === "deposit" ? "bank deposit" : "remittance"} recorded
                  {savedBatch ? ` · ${savedBatch.number}` : ""}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  {savedBatch
                    ? "Current balances for the receipts in this batch:"
                    : "Updating receipt balances…"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Dismiss matching confirmation"
              onClick={() => setSaved(null)}
            >
              <X size={15} />
            </Button>
          </div>
          {savedBatch && (
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {savedBatch.allocations.map((allocation) => {
                const match = progress.get(allocation.collectionId);
                return match ? (
                  <li
                    key={allocation.collectionId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card/70 px-3 py-2 text-xs"
                  >
                    <span>
                      <strong>{match.receipt.receiptNumber}</strong>
                      {match.remaining > 0 ? (
                        <>
                          {" "}
                          still has <strong>{formatMoney(match.remaining)}</strong> awaiting
                          matching.
                        </>
                      ) : (
                        " is fully matched."
                      )}
                    </span>
                    {match.remaining > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={saving || !canRecord}
                        onClick={() => startMatching(match.receipt.id)}
                      >
                        Match remaining <ArrowRight size={13} />
                      </Button>
                    )}
                  </li>
                ) : null;
              })}
            </ul>
          )}
        </section>
      )}
      <Card className="mb-6">
        <CardHeader className="gap-3">
          <div>
            <CardTitle>Receipt matching progress</CardTitle>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              See each receipt’s collected amount, total matched across batches and remaining
              balance.
            </p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search receipts or payers…"
            />
            <label className="text-xs font-semibold text-secondary">
              Show receipts
              <select
                value={receiptFilter}
                onChange={(event) => setReceiptFilter(event.target.value)}
                className="ml-2 h-9 max-w-full rounded-lg border border-border bg-card px-2 text-xs font-normal"
              >
                <option value="outstanding">With remaining balance</option>
                <option value="matched">Fully matched</option>
                <option value="all">All issued receipts</option>
              </select>
            </label>
          </div>
        </CardHeader>
        <div
          className="odc-scrollbar overflow-x-auto"
          role="region"
          aria-label="Receipt matching progress table"
          tabIndex={0}
        >
          <table className={tableClass}>
            <thead>
              <tr>
                {[
                  "Receipt / payer",
                  "Collected",
                  "Matched to date",
                  "Remaining",
                  "Matching status",
                  "Next action",
                ].map((label) => (
                  <th key={label} scope="col" className={thClass}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receiptPagination.items.map((match) => (
                <tr key={match.receipt.id} className="hover:bg-accent">
                  <td className={tdClass}>
                    <p className="font-bold text-foreground">{match.receipt.receiptNumber}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{match.receipt.payer}</p>
                  </td>
                  <td className={`${tdClass} money`}>{formatMoney(match.receipt.amount)}</td>
                  <td className={`${tdClass} money`}>{formatMoney(match.matched)}</td>
                  <td className={`${tdClass} money font-bold text-foreground`}>
                    {formatMoney(match.remaining)}
                  </td>
                  <td className={tdClass}>
                    <MatchingStatus status={match.status} />
                    <div
                      role="progressbar"
                      aria-label={`${match.receipt.receiptNumber} matching progress`}
                      aria-valuemin={0}
                      aria-valuemax={match.receipt.amount}
                      aria-valuenow={match.matched}
                      aria-valuetext={`${formatMoney(match.matched)} of ${formatMoney(match.receipt.amount)} matched`}
                      className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className={`h-full ${match.status === "matched" ? "bg-success" : "bg-brand"}`}
                        style={{ width: `${match.percent}%` }}
                      />
                    </div>
                  </td>
                  <td className={tdClass}>
                    {match.remaining > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={saving || !canRecord}
                        aria-label={`Match remaining for ${match.receipt.receiptNumber}`}
                        onClick={() => startMatching(match.receipt.id)}
                      >
                        Match {formatMoney(match.remaining)} <ArrowRight size={13} />
                      </Button>
                    ) : (
                      <span className="text-xs text-success">No balance remaining</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!receiptRows.length && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <p>
                {query.trim()
                  ? "No receipts match your search."
                  : !matches.length
                    ? "No issued receipts yet."
                    : receiptFilter === "outstanding"
                      ? "All issued receipts are fully matched."
                      : "No receipts in this view."}
              </p>
              {(query || receiptFilter !== "all") && matches.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setQuery("");
                    setReceiptFilter("all");
                  }}
                >
                  Show all receipts
                </Button>
              )}
            </div>
          )}
        </div>
        <TablePagination pagination={receiptPagination} label="Receipt matching progress" />
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Matching register</CardTitle>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Confirmed means the batch was recorded. A receipt can still be partially matched; its
            remaining balance is shown separately.
          </p>
        </CardHeader>
        <div
          className="odc-scrollbar overflow-x-auto"
          role="region"
          aria-label="Confirmed matching batches"
          tabIndex={0}
        >
          <table className={tableClass}>
            <thead>
              <tr>
                {[
                  "Reference",
                  "Type",
                  "Destination / evidence",
                  "Date",
                  "Receipt allocations",
                  "Batch status",
                  "Amount",
                  "Actions",
                ].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className={`${thClass} ${label === "Amount" ? "text-right" : ""}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagination.items.map((item) => (
                <tr key={item.id} className="hover:bg-accent">
                  <td className={`${tdClass} whitespace-nowrap font-bold text-foreground`}>
                    {item.number}
                  </td>
                  <td className={tdClass}>
                    {item.kind === "deposit" ? "Bank deposit" : "Remittance"}
                  </td>
                  <td className={tdClass}>
                    {item.bank}
                    <p className="mt-1 text-[11px] text-muted-foreground">{item.reference}</p>
                  </td>
                  <td className={tdClass}>{displayDate(item.date)}</td>
                  <td className={tdClass}>
                    <ul className="space-y-2">
                      {item.allocations.slice(0, 2).map((allocation) => {
                        const match = progress.get(allocation.collectionId);
                        const receipt = data.collections.find(
                          (collection) => collection.id === allocation.collectionId,
                        );
                        return (
                          <li key={allocation.collectionId}>
                            <p className="text-xs font-semibold text-secondary">
                              {receipt?.receiptNumber ?? "Receipt unavailable"}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {formatMoney(allocation.amount)} in this batch
                            </p>
                            {match && (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {match.remaining > 0
                                  ? `${formatMoney(match.remaining)} still to match`
                                  : "Fully matched across batches"}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {item.allocations.length > 2 && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        +{item.allocations.length - 2} more · View details
                      </p>
                    )}
                  </td>
                  <td className={tdClass}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className={`${tdClass} money text-right font-bold text-foreground`}>
                    {formatMoney(item.amount)}
                  </td>
                  <td className={tdClass}>
                    <div className="flex items-center justify-end gap-3">
                      <PdfButton documents={[depositDocument(data, item)]} label="PDF" />
                      <BatchDetails
                        batch={item}
                        data={data}
                        progress={progress}
                        onMatch={canRecord ? startMatching : undefined}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.deposits.length && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No matching batches recorded yet. Select a receipt above to get started.
            </p>
          )}
        </div>
        <TablePagination pagination={pagination} label="Deposits and remittances" />
      </Card>
    </>
  );
}
