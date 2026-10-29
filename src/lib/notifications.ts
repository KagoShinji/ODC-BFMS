import type { FinanceData } from "../domain/types";

export type WorkspaceNotification = {
  id: string;
  kind: "review" | "payment" | "collection" | "advance" | "activity";
  title: string;
  detail: string;
  href: string;
  date: string;
  amount?: number;
};

/** Derived only from the records already visible to the signed-in account. */
export function workspaceNotifications(data: FinanceData): WorkspaceNotification[] {
  const notifications: WorkspaceNotification[] = [];
  for (const voucher of data.vouchers) {
    if (voucher.status !== "submitted" && voucher.status !== "approved") continue;
    notifications.push({
      id: `voucher:${voucher.id}:${voucher.status}:${voucher.version}`,
      kind: voucher.status === "submitted" ? "review" : "payment",
      title:
        voucher.status === "submitted" ? "Voucher awaiting review" : "Voucher ready for payment",
      detail: `${voucher.number} · ${voucher.payee}`,
      href: `/disbursements?selected=${encodeURIComponent(voucher.id)}`,
      date: voucher.date,
      amount: voucher.amount,
    });
  }
  const matched = new Map<string, number>();
  for (const deposit of data.deposits) {
    for (const allocation of deposit.allocations) {
      matched.set(
        allocation.collectionId,
        (matched.get(allocation.collectionId) ?? 0) + allocation.amount,
      );
    }
  }
  for (const receipt of data.collections) {
    const remaining = receipt.amount - (matched.get(receipt.id) ?? 0);
    if (receipt.status !== "issued" || remaining <= 0) continue;
    notifications.push({
      id: `collection:${receipt.id}:${remaining}`,
      kind: "collection",
      title: "Receipt awaiting deposit matching",
      detail: `${receipt.receiptNumber} · ${receipt.payer}`,
      href: "/deposits",
      date: receipt.date,
      amount: remaining,
    });
  }
  const settled = new Map<string, number>();
  for (const entry of data.liquidationEntries) {
    settled.set(entry.advanceId, (settled.get(entry.advanceId) ?? 0) + entry.amount);
  }
  for (const advance of data.cashAdvances) {
    const remaining = advance.amount - (settled.get(advance.id) ?? 0);
    if (remaining <= 0) continue;
    notifications.push({
      id: `advance:${advance.id}:${remaining}`,
      kind: "advance",
      title: "Cash advance awaiting liquidation",
      detail: advance.accountablePerson,
      href: "/advances",
      date: advance.openedAt,
      amount: remaining,
    });
  }
  // Actionable work appears before the latest audit events.
  notifications.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  for (const event of [...data.audit].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10)) {
    notifications.push({
      id: `activity:${event.id}`,
      kind: "activity",
      title: event.action,
      detail: `${event.subject} · ${event.detail}`,
      href: "/audit",
      date: event.at,
    });
  }
  return notifications;
}

/** Invalid or unavailable browser storage must not prevent opening notifications. */
export function notificationReadIds(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string").slice(-2000)
      : [];
  } catch {
    return [];
  }
}
