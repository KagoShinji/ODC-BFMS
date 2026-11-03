import type { Collection, FinanceData } from "./types";

export interface ReceiptMatching {
  receipt: Collection;
  matched: number;
  remaining: number;
  status: "unmatched" | "partial" | "matched";
  percent: number;
}

/** Receipt progress includes every confirmed deposit and remittance allocation. */
export function receiptMatching(
  data: Pick<FinanceData, "collections" | "deposits">,
): ReceiptMatching[] {
  const allocated = new Map<string, number>();
  for (const batch of data.deposits) {
    for (const allocation of batch.allocations) {
      allocated.set(
        allocation.collectionId,
        (allocated.get(allocation.collectionId) ?? 0) + allocation.amount,
      );
    }
  }
  return data.collections
    .filter((receipt) => receipt.status === "issued")
    .map((receipt) => {
      const matched = Math.min(receipt.amount, allocated.get(receipt.id) ?? 0);
      const remaining = Math.max(0, receipt.amount - matched);
      return {
        receipt,
        matched,
        remaining,
        status: matched === 0 ? "unmatched" : remaining > 0 ? "partial" : "matched",
        percent: receipt.amount > 0 ? (matched / receipt.amount) * 100 : 0,
      };
    });
}
