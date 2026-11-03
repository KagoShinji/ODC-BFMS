import type { FinanceData } from "@/domain/types";
import { cashbookEvents } from "@/domain/cashbook";
import { committedForLine, receiptUnmatched } from "@/domain/finance";
import { displayDate, formatMoney } from "@/lib/utils";

export type ReportId =
  | "rao"
  | "saob"
  | "pbc"
  | "checks"
  | "raaf"
  | "cashbook"
  | "transmittal"
  | "reai"
  | "matching"
  | "rcd"
  | "rcr"
  | "liquidation";
export interface ReportDefinition {
  id: ReportId;
  title: string;
  description: string;
  status: "preview" | "template pending";
  columns: string[];
  rows: string[][];
  note?: string;
}

export function buildReports(data: FinanceData, demo = true): ReportDefinition[] {
  const collections = data.collections.filter((item) => item.status === "issued");
  const paid = data.vouchers.filter((item) => item.status === "paid");
  const budgetRows = data.budgetLines.map((line) => [
    line.code,
    line.name,
    formatMoney(line.appropriation),
    formatMoney(committedForLine(data, line.id)),
    formatMoney(line.appropriation - committedForLine(data, line.id)),
  ]);
  const categoryNames = [...new Set(data.budgetLines.map((line) => line.category))];
  const categoryRows = categoryNames.map((category) => {
    const lines = data.budgetLines.filter((line) => line.category === category);
    const total = lines.reduce((sum, line) => sum + line.appropriation, 0);
    const obligated = lines.reduce((sum, line) => sum + committedForLine(data, line.id), 0);
    return [category, formatMoney(total), formatMoney(obligated), formatMoney(total - obligated)];
  });
  const matchRows = collections.map((item) => [
    item.receiptNumber,
    item.payer,
    formatMoney(item.amount),
    formatMoney(item.amount - receiptUnmatched(data, item.id)),
    formatMoney(receiptUnmatched(data, item.id)),
  ]);
  const revenueCategories = [...new Set(collections.map((item) => item.revenueCategory))];
  const incomeRows = revenueCategories.map((category) => [
    category,
    "Pending approved estimate",
    formatMoney(
      collections
        .filter((item) => item.revenueCategory === category)
        .reduce((sum, item) => sum + item.amount, 0),
    ),
  ]);
  const events = cashbookEvents(data);
  let cash = data.cashOpening;
  let bank = data.bankOpening;
  const cashRows = [
    [
      "Opening balance",
      "—",
      demo ? "At start of demo period" : "Opening balance for loaded records",
      "—",
      "—",
      formatMoney(cash),
      formatMoney(bank),
    ],
    ...events.map((item) => {
      cash += item.cashIn - item.cashOut;
      bank += item.bankIn - item.bankOut;
      return [
        item.date ? displayDate(item.date) : "Date unavailable",
        item.reference,
        item.description,
        formatMoney(item.cashIn || item.bankIn),
        formatMoney(item.cashOut || item.bankOut),
        formatMoney(cash),
        formatMoney(bank),
      ];
    }),
  ];

  return [
    {
      id: "rao",
      title: "RAO",
      description: "Appropriations and obligations by budget line",
      status: "preview",
      columns: ["Account", "Budget line", "Appropriation", "Obligated", "Available"],
      rows: budgetRows,
      note: "Working preview. Confirm the approved RAO form and obligation cutoffs.",
    },
    {
      id: "saob",
      title: "SAOB",
      description: "Statement of appropriations, obligations and balances",
      status: "preview",
      columns: ["Category", "Appropriation", "Obligated", "Available"],
      rows: categoryRows,
      note: "Working summary. Official format and signatories require approval.",
    },
    {
      id: "pbc",
      title: "PBC",
      description: "Form title and layout to confirm",
      status: "template pending",
      columns: [],
      rows: [],
      note: "The process image names PBC but does not define its content. An approved sample is required.",
    },
    {
      id: "checks",
      title: "Summary of checks issued",
      description: "Paid vouchers and recorded payment references",
      status: "preview",
      columns: ["Voucher", "Payment ref", "Payee", "Date", "Amount"],
      rows: paid.map((item) => [
        item.number,
        item.paymentReference ?? "—",
        item.payee,
        displayDate(item.paidAt ?? item.date),
        formatMoney(item.amount),
      ]),
      note: "Confirm payment method and check series before official use.",
    },
    {
      id: "raaf",
      title: "RAAF",
      description: "Accountability for receipt and check forms",
      status: "template pending",
      columns: [],
      rows: [],
      note: "Accountable-form inventory and approved opening serial ranges are required to calculate this report.",
    },
    {
      id: "cashbook",
      title: "Cashbook",
      description: `Cash and bank movement from posted ${demo ? "demo" : "live"} records, all loaded dates`,
      status: "preview",
      columns: ["Date", "Reference", "Particulars", "In", "Out", "Cash on hand", "Cash in bank"],
      rows: cashRows,
      note: `${demo ? "Opening balances are synthetic." : "Opening balances and coverage must be verified before official use."} Official cashbook columns and posting rules require finance approval.`,
    },
    {
      id: "transmittal",
      title: "Transmittal",
      description: "Submission manifest and acknowledgement",
      status: "template pending",
      columns: [],
      rows: [],
      note: "A transmittal needs selected finalized documents, recipient and acknowledgement details.",
    },
    {
      id: "reai",
      title: "REAI",
      description: "Estimated and actual income",
      status: "preview",
      columns: ["Revenue category", "Approved estimate", "Actual collection"],
      rows: incomeRows,
      note: "Actuals are available; approved income estimates are required for the complete report.",
    },
    {
      id: "matching",
      title: "Matching of collection and deposit",
      description: "Receipt to deposit/remittance reconciliation",
      status: "preview",
      columns: ["Receipt", "Payer", "Collected", "Matched", "Unmatched"],
      rows: matchRows,
      note: "A partial match remains visible until fully allocated.",
    },
    {
      id: "rcd",
      title: "RCD",
      description: "Report of collections and deposits",
      status: "preview",
      columns: ["Deposit", "Bank", "Receipt", "Date", "Amount"],
      rows: data.deposits
        .filter((item) => item.kind === "deposit")
        .flatMap((item) =>
          item.allocations.map((allocation) => [
            item.number,
            item.bank,
            data.collections.find((collection) => collection.id === allocation.collectionId)
              ?.receiptNumber ?? "—",
            displayDate(item.date),
            formatMoney(allocation.amount),
          ]),
        ),
      note: "Confirm the prescribed RCD format, coverage and bank evidence.",
    },
    {
      id: "rcr",
      title: "RCR",
      description: "Report of collections and remittances",
      status: "preview",
      columns: ["Remittance", "Recipient", "Receipt", "Date", "Amount"],
      rows: data.deposits
        .filter((item) => item.kind === "remittance")
        .flatMap((item) =>
          item.allocations.map((allocation) => [
            item.number,
            item.bank,
            data.collections.find((collection) => collection.id === allocation.collectionId)
              ?.receiptNumber ?? "—",
            displayDate(item.date),
            formatMoney(allocation.amount),
          ]),
        ),
      note: "Working preview. Confirm when RCR applies and its approved form before official use.",
    },
    {
      id: "liquidation",
      title: "Liquidation report",
      description: "Cash advance and supporting expenses",
      status: "preview",
      columns: ["Voucher", "Accountable person", "Type", "Description", "Amount"],
      rows: data.cashAdvances.flatMap((advance) =>
        data.liquidationEntries
          .filter((entry) => entry.advanceId === advance.id)
          .map((entry) => [
            data.vouchers.find((voucher) => voucher.id === advance.voucherId)?.number ?? "—",
            advance.accountablePerson,
            entry.kind === "refund" ? "Refund" : "Expense",
            entry.description,
            formatMoney(entry.amount),
          ]),
      ),
      note: "Working preview. Evidence, review, approval and official layout are still required.",
    },
  ];
}
