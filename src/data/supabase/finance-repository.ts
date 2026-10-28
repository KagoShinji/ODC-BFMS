import type { SupabaseClient } from "@supabase/supabase-js";

/** Typed request boundary for the first live financial slice.
 * The UI remains in demo mode until these calls and their policies pass staging UAT.
 */
export class SupabaseFinanceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async currentUser() {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  async budgetLines(barangayId: string, fiscalYear: number) {
    const { data, error } = await this.client
      .from("budget_lines")
      .select("id, barangay_id, code, name, category, fund, appropriation, fiscal_year")
      .eq("barangay_id", barangayId)
      .eq("fiscal_year", fiscalYear)
      .order("code");
    if (error) throw error;
    return data;
  }

  async expenseCases(barangayId: string) {
    const { data, error } = await this.client
      .from("expense_cases")
      .select("id, reference, kind, step, purpose, payee, budget_line_id, amount, business_date")
      .eq("barangay_id", barangayId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }

  async vouchers(barangayId: string) {
    const { data, error } = await this.client
      .from("vouchers")
      .select(
        "id, number, source_case_id, kind, payee, purpose, budget_line_id, amount, status, business_date, version, payment_reference",
      )
      .eq("barangay_id", barangayId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }

  async collections(barangayId: string) {
    const { data, error } = await this.client
      .from("collections")
      .select("id, receipt_number, payer, purpose, revenue_category, amount, business_date, status")
      .eq("barangay_id", barangayId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }

  async deposits(barangayId: string) {
    const { data, error } = await this.client
      .from("deposits")
      .select(
        "id, number, kind, bank, reference, amount, business_date, status, deposit_allocations(collection_id, amount)",
      )
      .eq("barangay_id", barangayId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }

  private async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw error;
    return data as T;
  }

  createExpenseCase(input: {
    barangayId: string;
    kind: string;
    purpose: string;
    payee: string;
    budgetLineId: string;
    amount: string;
  }) {
    return this.rpc<string>("create_expense_case", {
      p_barangay_id: input.barangayId,
      p_kind: input.kind,
      p_purpose: input.purpose,
      p_payee: input.payee,
      p_budget_line_id: input.budgetLineId,
      p_amount: input.amount,
    });
  }
  createVoucher(caseId: string) {
    return this.rpc<string>("create_voucher", { p_case_id: caseId });
  }
  submitVoucher(voucherId: string, expectedVersion: number) {
    return this.rpc<void>("submit_voucher", {
      p_voucher_id: voucherId,
      p_expected_version: expectedVersion,
    });
  }
  approveVoucher(voucherId: string, expectedVersion: number) {
    return this.rpc<void>("approve_voucher", {
      p_voucher_id: voucherId,
      p_expected_version: expectedVersion,
    });
  }
  recordPayment(voucherId: string, expectedVersion: number, reference: string) {
    return this.rpc<void>("record_payment", {
      p_voucher_id: voucherId,
      p_expected_version: expectedVersion,
      p_reference: reference,
    });
  }
  issueCollection(input: {
    barangayId: string;
    payer: string;
    purpose: string;
    category: string;
    amount: string;
  }) {
    return this.rpc<string>("issue_collection", {
      p_barangay_id: input.barangayId,
      p_payer: input.payer,
      p_purpose: input.purpose,
      p_category: input.category,
      p_amount: input.amount,
    });
  }
  confirmDeposit(input: {
    barangayId: string;
    kind: "deposit" | "remittance";
    bank: string;
    reference: string;
    allocations: Array<{ collectionId: string; amount: string }>;
  }) {
    return this.rpc<string>("confirm_deposit", {
      p_barangay_id: input.barangayId,
      p_kind: input.kind,
      p_bank: input.bank,
      p_reference: input.reference,
      p_allocations: input.allocations.map((entry) => ({
        collection_id: entry.collectionId,
        amount: entry.amount,
      })),
    });
  }
}
