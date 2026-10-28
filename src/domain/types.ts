export const expenseKinds = ["procurement", "payroll", "recurring", "travel", "transfer"] as const;
export type ExpenseKind = (typeof expenseKinds)[number];
export type VoucherStatus = "draft" | "submitted" | "approved" | "paid" | "rejected";
export type ExpenseStep = "PR" | "RFQ" | "PO" | "AIR" | "Ready for DV";

export interface BudgetLine {
  id: string;
  code: string;
  name: string;
  fund: string;
  category: "Personnel Services" | "Maintenance & Operations" | "Capital Outlay" | "Transfers";
  appropriation: number;
  color: string;
}

export interface ExpenseCase {
  id: string;
  reference: string;
  kind: ExpenseKind;
  step: ExpenseStep;
  purpose: string;
  payee: string;
  budgetLineId: string;
  amount: number;
  date: string;
  voucherId?: string;
}

export interface Voucher {
  id: string;
  number: string;
  sourceCaseId: string;
  kind: ExpenseKind;
  payee: string;
  purpose: string;
  budgetLineId: string;
  amount: number;
  status: VoucherStatus;
  date: string;
  paidAt?: string;
  paymentReference?: string;
  version: number;
}

export interface Collection {
  id: string;
  receiptNumber: string;
  payer: string;
  purpose: string;
  revenueCategory: string;
  amount: number;
  date: string;
  status: "issued" | "voided";
}

export interface DepositAllocation {
  collectionId: string;
  amount: number;
}
export interface Deposit {
  id: string;
  number: string;
  kind: "deposit" | "remittance";
  bank: string;
  reference: string;
  date: string;
  amount: number;
  allocations: DepositAllocation[];
  status: "confirmed";
}

export interface CashAdvance {
  id: string;
  voucherId: string;
  accountablePerson: string;
  amount: number;
  openedAt: string;
}

export interface LiquidationEntry {
  id: string;
  advanceId: string;
  kind: "expense" | "refund";
  description: string;
  amount: number;
  date: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  subject: string;
  detail: string;
  at: string;
  actor: string;
}

export interface FinanceData {
  schemaVersion: 2;
  barangay: string;
  fiscalYear: number;
  cashOpening: number;
  bankOpening: number;
  budgetLines: BudgetLine[];
  expenseCases: ExpenseCase[];
  vouchers: Voucher[];
  collections: Collection[];
  deposits: Deposit[];
  cashAdvances: CashAdvance[];
  liquidationEntries: LiquidationEntry[];
  audit: AuditEvent[];
}

export const kindLabel: Record<ExpenseKind, string> = {
  procurement: "Procurement",
  payroll: "Payroll",
  recurring: "Recurring fees",
  travel: "Travel",
  transfer: "SK fund transfer",
};

export const nextProcurementStep: Record<ExpenseStep, ExpenseStep | null> = {
  PR: "RFQ",
  RFQ: "PO",
  PO: "AIR",
  AIR: "Ready for DV",
  "Ready for DV": null,
};
