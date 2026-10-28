import type { FinanceData, Voucher } from "./types";

export function parseMoney(value: string) {
  const normalized = value.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [pesos, cents = ""] = normalized.split(".");
  const amount = Number(pesos) * 100 + Number(cents.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function committedForLine(data: FinanceData, lineId: string) {
  return data.vouchers
    .filter(
      (voucher) =>
        voucher.budgetLineId === lineId && !["draft", "rejected"].includes(voucher.status),
    )
    .reduce((sum, voucher) => sum + voucher.amount, 0);
}

export function availableForLine(data: FinanceData, lineId: string) {
  const line = data.budgetLines.find((item) => item.id === lineId);
  return (line?.appropriation ?? 0) - committedForLine(data, lineId);
}

export function receiptUnmatched(data: FinanceData, collectionId: string) {
  const collection = data.collections.find((item) => item.id === collectionId);
  if (!collection || collection.status !== "issued") return 0;
  const allocated = data.deposits.reduce(
    (sum, deposit) =>
      sum +
      deposit.allocations
        .filter((allocation) => allocation.collectionId === collectionId)
        .reduce((partial, allocation) => partial + allocation.amount, 0),
    0,
  );
  return Math.max(0, collection.amount - allocated);
}

export function dashboardTotals(data: FinanceData) {
  const appropriation = data.budgetLines.reduce((sum, line) => sum + line.appropriation, 0);
  const obligated = data.vouchers
    .filter((voucher) => !["draft", "rejected"].includes(voucher.status))
    .reduce((sum, voucher) => sum + voucher.amount, 0);
  const paid = data.vouchers
    .filter((voucher) => voucher.status === "paid")
    .reduce((sum, voucher) => sum + voucher.amount, 0);
  const collected = data.collections
    .filter((collection) => collection.status === "issued")
    .reduce((sum, collection) => sum + collection.amount, 0);
  const deposited = data.deposits
    .filter((item) => item.kind === "deposit")
    .reduce((sum, deposit) => sum + deposit.amount, 0);
  const remitted = data.deposits
    .filter((item) => item.kind === "remittance")
    .reduce((sum, deposit) => sum + deposit.amount, 0);
  const refunded = data.liquidationEntries
    .filter((item) => item.kind === "refund")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const advanceOutstanding =
    data.cashAdvances.reduce((sum, advance) => sum + advance.amount, 0) -
    data.liquidationEntries.reduce((sum, entry) => sum + entry.amount, 0);
  return {
    appropriation,
    obligated,
    available: appropriation - obligated,
    paid,
    collected,
    deposited,
    remitted,
    advanceOutstanding,
    cash: data.cashOpening + collected + refunded - deposited - remitted,
    bank: data.bankOpening + deposited - paid,
    pending: data.vouchers.filter((voucher) => voucher.status === "submitted").length,
    readyToPay: data.vouchers.filter((voucher) => voucher.status === "approved").length,
    undeposited: collected - deposited - remitted,
  };
}

export function canSubmitVoucher(data: FinanceData, voucher: Voucher) {
  if (voucher.status !== "draft") return "Only draft vouchers can be submitted.";
  if (voucher.amount <= 0) return "Enter an amount greater than zero.";
  if (availableForLine(data, voucher.budgetLineId) < voucher.amount)
    return "This budget line has insufficient available appropriation.";
  return null;
}

export function nextNumber(prefix: string, records: string[], year: number) {
  const sequence =
    Math.max(
      0,
      ...records.map((record) => {
        const match = record.match(new RegExp(`^${prefix}-${year}-(\\d+)$`));
        return match ? Number(match[1]) : 0;
      }),
    ) + 1;
  return `${prefix}-${year}-${String(sequence).padStart(3, "0")}`;
}
