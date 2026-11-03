import type { ReceiptMatching } from "@/domain/matching";

export function MatchingStatus({ status }: { status: ReceiptMatching["status"] }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ${status === "matched" ? "bg-success-soft text-success" : status === "partial" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"}`}
    >
      {status === "matched"
        ? "Fully matched"
        : status === "partial"
          ? "Partially matched"
          : "Not matched"}
    </span>
  );
}
