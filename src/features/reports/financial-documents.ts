import type {
  BudgetLine,
  CashAdvance,
  Collection,
  Deposit,
  ExpenseCase,
  FinanceData,
  Voucher,
  AuditEvent,
} from "@/domain/types";
import { kindLabel } from "@/domain/types";
import { committedForLine, receiptUnmatched } from "@/domain/finance";
import { displayDate, formatMoney } from "@/lib/utils";
import type { PrintDocument } from "@/lib/print-document";

const recordNote =
  "System record copy. Use the prescribed approved form and supporting evidence for official submission.";
const budgetName = (data: FinanceData, id: string) => {
  const line = data.budgetLines.find((item) => item.id === id);
  return line ? `${line.code} · ${line.name}` : "—";
};

export function budgetDocument(
  data: FinanceData,
  lines: BudgetLine[] = data.budgetLines,
): PrintDocument {
  return {
    title: "Budget register",
    columns: [
      "Account",
      "Budget line",
      "Fund",
      "Category",
      "Appropriation",
      "Obligated",
      "Available",
    ],
    rows: lines.map((item) => [
      item.code,
      item.name,
      item.fund,
      item.category,
      formatMoney(item.appropriation),
      formatMoney(committedForLine(data, item.id)),
      formatMoney(item.appropriation - committedForLine(data, item.id)),
    ]),
    note: recordNote,
  };
}

export function expenseRegister(
  data: FinanceData,
  items: ExpenseCase[] = data.expenseCases,
): PrintDocument {
  return {
    title: "Expense case register",
    columns: ["Reference", "Type", "Payee", "Purpose", "Date", "Stage", "Amount"],
    rows: items.map((item) => [
      item.reference,
      kindLabel[item.kind],
      item.payee,
      item.purpose,
      displayDate(item.date),
      item.step,
      formatMoney(item.amount),
    ]),
    note: recordNote,
  };
}

export function expenseDocument(data: FinanceData, item: ExpenseCase): PrintDocument {
  return {
    title: `Expense case · ${item.reference}`,
    fields: [
      ["Reference", item.reference],
      ["Type", kindLabel[item.kind]],
      ["Date", displayDate(item.date)],
      ["Current stage", item.step],
      ["Payee / recipient", item.payee],
      ["Amount", formatMoney(item.amount)],
      ["Purpose", item.purpose],
      ["Budget line", budgetName(data, item.budgetLineId)],
      [
        "Linked voucher",
        data.vouchers.find((voucher) => voucher.id === item.voucherId)?.number ?? "Not yet created",
      ],
    ],
    note: `${recordNote} This summary records the workflow stage; it does not replace PR, RFQ, PO or inspection forms.`,
  };
}

export function voucherRegister(
  data: FinanceData,
  items: Voucher[] = data.vouchers,
): PrintDocument {
  return {
    title: "Disbursement voucher register",
    columns: ["Voucher", "Payee", "Purpose", "Date", "Status", "Payment reference", "Amount"],
    rows: items.map((item) => [
      item.number,
      item.payee,
      item.purpose,
      displayDate(item.date),
      item.status.toUpperCase(),
      item.paymentReference ?? "—",
      formatMoney(item.amount),
    ]),
    note: recordNote,
  };
}

export function voucherDocument(data: FinanceData, item: Voucher): PrintDocument {
  return {
    title: `Disbursement voucher · ${item.number}`,
    fields: [
      ["Voucher number", item.number],
      ["Status", item.status.toUpperCase()],
      ["Date", displayDate(item.date)],
      ["Expense type", kindLabel[item.kind]],
      ["Payee", item.payee],
      ["Amount", formatMoney(item.amount)],
      ["Purpose", item.purpose],
      ["Budget line", budgetName(data, item.budgetLineId)],
      [
        "Source case",
        data.expenseCases.find((entry) => entry.id === item.sourceCaseId)?.reference ?? "—",
      ],
      ["Payment reference", item.paymentReference ?? "—"],
      ["Payment date", item.paidAt ? displayDate(item.paidAt) : "—"],
    ],
    note: recordNote,
  };
}

export function collectionRegister(
  data: FinanceData,
  items: Collection[] = data.collections,
): PrintDocument {
  return {
    title: "Collection and receipt register",
    columns: ["Receipt", "Payer", "Purpose", "Date", "Status", "Amount", "Unmatched"],
    rows: items.map((item) => [
      item.receiptNumber,
      item.payer,
      item.purpose,
      displayDate(item.date),
      item.status.toUpperCase(),
      formatMoney(item.amount),
      formatMoney(receiptUnmatched(data, item.id)),
    ]),
    note: recordNote,
  };
}

export function collectionDocument(data: FinanceData, item: Collection): PrintDocument {
  return {
    title: `Collection record · ${item.receiptNumber}`,
    fields: [
      ["Receipt reference", item.receiptNumber],
      ["Status", item.status.toUpperCase()],
      ["Date", displayDate(item.date)],
      ["Payer", item.payer],
      ["Purpose", item.purpose],
      ["Revenue category", item.revenueCategory],
      ["Amount collected", formatMoney(item.amount)],
      ["Unmatched balance", formatMoney(receiptUnmatched(data, item.id))],
    ],
    note: `${item.status === "voided" ? "VOIDED RECEIPT. " : ""}${recordNote} This copy does not replace an official accountable receipt.`,
  };
}

export function depositRegister(data: FinanceData): PrintDocument {
  return {
    title: "Deposit and remittance register",
    columns: ["Number", "Type", "Destination", "Reference", "Date", "Status", "Amount"],
    rows: data.deposits.map((item) => [
      item.number,
      item.kind,
      item.bank,
      item.reference,
      displayDate(item.date),
      item.status.toUpperCase(),
      formatMoney(item.amount),
    ]),
    note: recordNote,
  };
}

export function depositDocument(data: FinanceData, item: Deposit): PrintDocument {
  return {
    title: `${item.kind === "deposit" ? "Bank deposit" : "Treasury remittance"} · ${item.number}`,
    fields: [
      ["Number", item.number],
      ["Status", item.status.toUpperCase()],
      ["Date", displayDate(item.date)],
      ["Destination", item.bank],
      ["Evidence reference", item.reference],
      ["Total amount", formatMoney(item.amount)],
    ],
    columns: ["Receipt", "Payer", "Allocated amount"],
    rows: item.allocations.map((allocation) => {
      const receipt = data.collections.find((entry) => entry.id === allocation.collectionId);
      return [receipt?.receiptNumber ?? "—", receipt?.payer ?? "—", formatMoney(allocation.amount)];
    }),
    note: recordNote,
  };
}

export function advanceRegister(data: FinanceData): PrintDocument {
  return {
    title: "Cash advance register",
    columns: ["Voucher", "Accountable person", "Opened", "Advance", "Settled", "Outstanding"],
    rows: data.cashAdvances.map((item) => {
      const settled = data.liquidationEntries
        .filter((entry) => entry.advanceId === item.id)
        .reduce((sum, entry) => sum + entry.amount, 0);
      return [
        data.vouchers.find((voucher) => voucher.id === item.voucherId)?.number ?? "—",
        item.accountablePerson,
        displayDate(item.openedAt),
        formatMoney(item.amount),
        formatMoney(settled),
        formatMoney(item.amount - settled),
      ];
    }),
    note: recordNote,
  };
}

export function advanceDocument(data: FinanceData, item: CashAdvance): PrintDocument {
  const entries = data.liquidationEntries.filter((entry) => entry.advanceId === item.id);
  const settled = entries.reduce((sum, entry) => sum + entry.amount, 0);
  return {
    title: "Cash advance and liquidation record",
    fields: [
      ["Voucher", data.vouchers.find((voucher) => voucher.id === item.voucherId)?.number ?? "—"],
      ["Accountable person", item.accountablePerson],
      ["Opened", displayDate(item.openedAt)],
      ["Advance amount", formatMoney(item.amount)],
      ["Settled", formatMoney(settled)],
      ["Outstanding", formatMoney(item.amount - settled)],
    ],
    columns: ["Date", "Type", "Description / evidence", "Amount"],
    rows: entries.map((entry) => [
      displayDate(entry.date),
      entry.kind === "refund" ? "Cash refund" : "Accepted expense",
      entry.description,
      formatMoney(entry.amount),
    ]),
    note: recordNote,
  };
}

export function auditDocument(items: AuditEvent[]): PrintDocument {
  return {
    title: "Activity and audit trail",
    columns: ["Time (Asia/Manila)", "Actor", "Action", "Subject", "Detail"],
    rows: items.map((item) => [
      new Date(item.at).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      }),
      item.actor,
      item.action,
      item.subject,
      item.detail,
    ]),
    note: "Export of the currently loaded activity records. This copy is not a complete historical audit archive.",
  };
}
