"use client";

import { useRef, useState } from "react";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/ui/table-pagination";
import { ArrowRight } from "lucide-react";
import type { Deposit, FinanceData } from "@/domain/types";
import type { ReceiptMatching } from "@/domain/matching";
import { displayDate, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge, tableClass, tdClass, thClass } from "@/components/financial/shared";
import { MatchingStatus } from "./matching-status";

export function BatchDetails({
  batch,
  data,
  progress,
  onMatch,
}: {
  batch: Deposit;
  data: FinanceData;
  progress: Map<string, ReceiptMatching>;
  onMatch?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const followingMatch = useRef(false);
  const pagination = usePagination(batch.allocations, JSON.stringify([batch.id, open]));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`View details for ${batch.number}`}>
          View details
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-4xl"
        onCloseAutoFocus={(event) => {
          if (followingMatch.current) {
            event.preventDefault();
            followingMatch.current = false;
          }
        }}
      >
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>{batch.number}</DialogTitle>
          <DialogDescription className="pt-2 leading-5">
            This batch records its allocated amounts. Receipt balances below include all confirmed
            batches.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-4 rounded-xl bg-muted p-4 text-xs sm:grid-cols-3">
          {[
            ["Transaction type", batch.kind === "deposit" ? "Bank deposit" : "Treasury remittance"],
            ["Destination", batch.bank],
            ["Evidence reference", batch.reference],
            ["Date", displayDate(batch.date)],
            ["Batch amount", formatMoney(batch.amount)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-words font-semibold text-foreground">{value}</dd>
            </div>
          ))}
          <div>
            <dt className="mb-1 text-muted-foreground">Batch status</dt>
            <dd>
              <StatusBadge status={batch.status} />
            </dd>
          </div>
        </dl>
        <div
          className="odc-scrollbar overflow-x-auto rounded-xl border border-border"
          role="region"
          aria-label="Batch receipt allocations"
          tabIndex={0}
        >
          <table className={tableClass}>
            <caption className="sr-only">
              Allocations in {batch.number} and current receipt balances
            </caption>
            <thead>
              <tr>
                {[
                  "Receipt / payer",
                  "In this batch",
                  "Collected",
                  "Matched to date",
                  "Remaining",
                  "Matching status",
                ].map((label) => (
                  <th key={label} scope="col" className={thClass}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagination.items.map((allocation) => {
                const match = progress.get(allocation.collectionId);
                const receipt = data.collections.find(
                  (item) => item.id === allocation.collectionId,
                );
                return (
                  <tr key={allocation.collectionId}>
                    <td className={tdClass}>
                      <p className="font-bold text-foreground">
                        {receipt?.receiptNumber ?? "Receipt unavailable"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {receipt?.payer ?? allocation.collectionId}
                      </p>
                    </td>
                    <td className={`${tdClass} money font-bold`}>
                      {formatMoney(allocation.amount)}
                    </td>
                    <td className={`${tdClass} money`}>
                      {receipt ? formatMoney(receipt.amount) : "—"}
                    </td>
                    <td className={`${tdClass} money`}>
                      {match ? formatMoney(match.matched) : "—"}
                    </td>
                    <td className={`${tdClass} money font-bold`}>
                      {match ? formatMoney(match.remaining) : "—"}
                    </td>
                    <td className={tdClass}>
                      {match ? (
                        <div className="space-y-2">
                          <MatchingStatus status={match.status} />
                          {match.remaining > 0 && onMatch && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                followingMatch.current = true;
                                setOpen(false);
                                onMatch(match.receipt.id);
                              }}
                            >
                              Match remaining <ArrowRight size={13} />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {receipt?.status === "voided" ? "Voided receipt" : "Balance unavailable"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination pagination={pagination} label="Batch receipt allocations" />
      </DialogContent>
    </Dialog>
  );
}
