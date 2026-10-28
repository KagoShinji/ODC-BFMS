import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditEvent,
  BudgetLine,
  ExpenseKind,
  ExpenseStep,
  FinanceData,
  VoucherStatus,
} from "@/domain/types";
import { todayManila } from "@/lib/utils";

const lineColors = ["#f56618", "#3a86a2", "#698765", "#aa7b53", "#8e719b", "#b65d4e"];
const categories: BudgetLine["category"][] = [
  "Personnel Services",
  "Maintenance & Operations",
  "Capital Outlay",
  "Transfers",
];

// Postgres numeric(18,2) pesos → integer centavos used throughout the UI.
const centavos = (value: unknown) => Math.round(Number(value) * 100);

const manilaDate = (value: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(value));

const humanize = (value: string) =>
  value.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());

export function emptyFinanceData(barangay: string): FinanceData {
  return {
    schemaVersion: 2,
    barangay,
    fiscalYear: Number(todayManila().slice(0, 4)),
    cashOpening: 0,
    bankOpening: 0,
    budgetLines: [],
    expenseCases: [],
    vouchers: [],
    collections: [],
    deposits: [],
    cashAdvances: [],
    liquidationEntries: [],
    audit: [],
  };
}

/**
 * Reads one barangay's live records under row level security. Tables a role
 * cannot read come back empty. Opening balances have no live table yet and start
 * at zero.
 */
export async function loadFinanceData(
  supabase: SupabaseClient,
  barangay: { id: string; name: string },
): Promise<{ data: FinanceData; error?: string }> {
  const data = emptyFinanceData(barangay.name);
  const id = barangay.id;
  const [
    lines,
    cases,
    vouchers,
    collections,
    deposits,
    allocations,
    audit,
    advances,
    liquidations,
  ] = await Promise.all([
    supabase
      .from("budget_lines")
      .select("id, code, name, category, fund, appropriation")
      .eq("barangay_id", id)
      .eq("fiscal_year", data.fiscalYear)
      .order("code"),
    supabase
      .from("expense_cases")
      .select("id, reference, kind, step, purpose, payee, budget_line_id, amount, business_date")
      .eq("barangay_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("vouchers")
      .select(
        "id, number, source_case_id, kind, payee, purpose, budget_line_id, amount, status, business_date, paid_at, payment_reference, version",
      )
      .eq("barangay_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("collections")
      .select("id, receipt_number, payer, purpose, revenue_category, amount, business_date, status")
      .eq("barangay_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("deposits")
      .select("id, number, kind, bank, reference, amount, business_date, status")
      .eq("barangay_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("deposit_allocations")
      .select("deposit_id, collection_id, amount")
      .eq("barangay_id", id),
    supabase
      .from("audit_events")
      .select("id, actor_id, action, subject_type, detail, created_at")
      .eq("barangay_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("cash_advances")
      .select("id, voucher_id, accountable_person, amount, opened_at")
      .eq("barangay_id", id)
      .order("opened_at", { ascending: false }),
    supabase
      .from("liquidation_entries")
      .select("id, advance_id, kind, description, amount, business_date")
      .eq("barangay_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const failed = [lines, cases, vouchers, collections, deposits, allocations, audit].some(
    (result) => result.error,
  );

  data.budgetLines = (lines.data ?? []).map((line, index) => ({
    id: line.id,
    code: line.code,
    name: line.name,
    fund: line.fund,
    category: categories.includes(line.category) ? line.category : "Maintenance & Operations",
    appropriation: centavos(line.appropriation),
    color: lineColors[index % lineColors.length],
  }));
  const voucherByCase = new Map(
    (vouchers.data ?? []).map((item) => [item.source_case_id, item.id]),
  );
  data.expenseCases = (cases.data ?? []).map((item) => ({
    id: item.id,
    reference: item.reference,
    kind: item.kind as ExpenseKind,
    step: item.step as ExpenseStep,
    purpose: item.purpose,
    payee: item.payee,
    budgetLineId: item.budget_line_id,
    amount: centavos(item.amount),
    date: item.business_date,
    voucherId: voucherByCase.get(item.id),
  }));
  data.vouchers = (vouchers.data ?? []).map((item) => ({
    id: item.id,
    number: item.number,
    sourceCaseId: item.source_case_id,
    kind: item.kind as ExpenseKind,
    payee: item.payee,
    purpose: item.purpose,
    budgetLineId: item.budget_line_id,
    amount: centavos(item.amount),
    status: item.status as VoucherStatus,
    date: item.business_date,
    paidAt: item.paid_at ? manilaDate(item.paid_at) : undefined,
    paymentReference: item.payment_reference ?? undefined,
    version: item.version,
  }));
  data.collections = (collections.data ?? []).map((item) => ({
    id: item.id,
    receiptNumber: item.receipt_number,
    payer: item.payer,
    purpose: item.purpose,
    revenueCategory: item.revenue_category,
    amount: centavos(item.amount),
    date: item.business_date,
    status: item.status,
  }));
  // Advances arrive with 202611020001_cash_advances.sql; before it they stay empty.
  data.cashAdvances = (advances.data ?? []).map((item) => ({
    id: item.id,
    voucherId: item.voucher_id,
    accountablePerson: item.accountable_person,
    amount: centavos(item.amount),
    openedAt: item.opened_at,
  }));
  data.liquidationEntries = (liquidations.data ?? []).map((item) => ({
    id: item.id,
    advanceId: item.advance_id,
    kind: item.kind,
    description: item.description,
    amount: centavos(item.amount),
    date: item.business_date,
  }));
  data.deposits = (deposits.data ?? []).map((item) => ({
    id: item.id,
    number: item.number,
    kind: item.kind,
    bank: item.bank,
    reference: item.reference,
    date: item.business_date,
    amount: centavos(item.amount),
    status: item.status,
    allocations: (allocations.data ?? [])
      .filter((allocation) => allocation.deposit_id === item.id)
      .map((allocation) => ({
        collectionId: allocation.collection_id,
        amount: centavos(allocation.amount),
      })),
  }));

  const actorIds = [...new Set((audit.data ?? []).map((item) => item.actor_id as string))];
  const actors = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles } = await supabase
      .from("staff_profiles")
      .select("user_id, full_name")
      .in("user_id", actorIds);
    (profiles ?? []).forEach((profile) => actors.set(profile.user_id, profile.full_name));
  }
  data.audit = (audit.data ?? []).map((item): AuditEvent => ({
    id: item.id,
    action: humanize(item.action),
    subject: humanize(item.subject_type),
    detail: Object.entries((item.detail ?? {}) as Record<string, unknown>)
      .map(([key, value]) => `${humanize(key)}: ${String(value)}`)
      .join(" · "),
    at: item.created_at,
    actor: actors.get(item.actor_id) ?? "Staff member",
  }));

  return {
    data,
    error: failed
      ? "Some records could not be loaded. Check that the database migrations are applied."
      : undefined,
  };
}
