import type { CashbookEntry, FinanceData } from "./types";

export interface CashEvent {
  date: string;
  order: string;
  reference: string;
  description: string;
  cashIn: number;
  cashOut: number;
  bankIn: number;
  bankOut: number;
}

function particulars(data: FinanceData, entry: CashbookEntry) {
  switch (entry.sourceType) {
    case "collection":
    case "collection_void": {
      const receipt = data.collections.find((item) => item.id === entry.sourceId);
      return {
        reference: receipt?.receiptNumber ?? entry.sourceId,
        description:
          entry.sourceType === "collection_void"
            ? `Receipt void: ${receipt?.purpose ?? entry.sourceId}`
            : (receipt?.purpose ?? "Collection received"),
      };
    }
    case "payment": {
      const voucher = data.vouchers.find((item) => item.id === entry.sourceId);
      return {
        reference: voucher?.number ?? entry.sourceId,
        description: `Payment to ${voucher?.payee ?? "payee unavailable"}`,
      };
    }
    case "deposit": {
      const deposit = data.deposits.find((item) => item.id === entry.sourceId);
      return {
        reference: deposit?.number ?? entry.sourceId,
        description: `${deposit?.kind === "remittance" ? "Remittance to" : "Deposit to"} ${deposit?.bank ?? "destination unavailable"}`,
      };
    }
    case "advance_refund": {
      const refund = data.liquidationEntries.find((item) => item.id === entry.sourceId);
      return {
        reference: `REF-${entry.sourceId.slice(0, 8)}`,
        description: `Advance refund: ${refund?.description ?? entry.sourceId}`,
      };
    }
  }
}

const sourceOrder: Record<CashbookEntry["sourceType"], number> = {
  collection: 0,
  advance_refund: 1,
  deposit: 2,
  payment: 3,
  collection_void: 4,
};

/** Group the cash and bank legs of a transfer without discarding dated reversals. */
export function cashbookEvents(data: FinanceData): CashEvent[] {
  if (data.cashbookEntries !== undefined) {
    const events = new Map<string, CashEvent>();
    for (const entry of [...data.cashbookEntries].sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    )) {
      const key = `${entry.sourceType}:${entry.sourceId}:${entry.date}`;
      const event = events.get(key) ?? {
        date: entry.date,
        order: `${entry.createdAt}:${sourceOrder[entry.sourceType]}:${entry.sourceId}`,
        ...particulars(data, entry),
        cashIn: 0,
        cashOut: 0,
        bankIn: 0,
        bankOut: 0,
      };
      if (entry.account === "cash") {
        event.cashIn += Math.max(0, entry.amount);
        event.cashOut += Math.max(0, -entry.amount);
      } else {
        event.bankIn += Math.max(0, entry.amount);
        event.bankOut += Math.max(0, -entry.amount);
      }
      events.set(key, event);
    }
    return [...events.values()].sort(
      (a, b) => a.date.localeCompare(b.date) || a.order.localeCompare(b.order),
    );
  }

  // Browser data predates a persistent ledger. Preserve both receipt and void;
  // do not invent a historical void date for an older saved demo record.
  const events: CashEvent[] = [
    ...data.collections.flatMap((item): CashEvent[] => [
      {
        date: item.date,
        order: `0:${item.id}`,
        reference: item.receiptNumber,
        description: item.purpose,
        cashIn: item.amount,
        cashOut: 0,
        bankIn: 0,
        bankOut: 0,
      },
      ...(item.status === "voided"
        ? [
            {
              date: item.voidedAt ?? "",
              order: `4:${item.id}`,
              reference: item.receiptNumber,
              description: `Receipt void: ${item.purpose}${item.voidedAt ? "" : " (void date not recorded)"}`,
              cashIn: 0,
              cashOut: item.amount,
              bankIn: 0,
              bankOut: 0,
            },
          ]
        : []),
    ]),
    ...data.deposits.map((item) => ({
      date: item.date,
      order: `2:${item.id}`,
      reference: item.number,
      description: `${item.kind === "deposit" ? "Deposit to" : "Remittance to"} ${item.bank}`,
      cashIn: 0,
      cashOut: item.amount,
      bankIn: item.kind === "deposit" ? item.amount : 0,
      bankOut: 0,
    })),
    ...data.vouchers
      .filter((item) => item.status === "paid")
      .map((item) => ({
        date: item.paidAt ?? item.date,
        order: `3:${item.id}`,
        reference: item.number,
        description: `Payment to ${item.payee}`,
        cashIn: 0,
        cashOut: 0,
        bankIn: 0,
        bankOut: item.amount,
      })),
    ...data.liquidationEntries
      .filter((item) => item.kind === "refund")
      .map((item) => ({
        date: item.date,
        order: `1:${item.id}`,
        reference: `REF-${item.id.slice(0, 8)}`,
        description: `Advance refund: ${item.description}`,
        cashIn: item.amount,
        cashOut: 0,
        bankIn: 0,
        bankOut: 0,
      })),
  ];
  return events.sort(
    (a, b) => (a.date || "9999").localeCompare(b.date || "9999") || a.order.localeCompare(b.order),
  );
}
