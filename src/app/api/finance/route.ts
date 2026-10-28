import { NextResponse, type NextRequest } from "next/server";
import { getWorkspaceBarangays } from "@/lib/auth/active-barangay";
import { currentAccount } from "@/lib/auth/session";
import { canRecordLive } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type Args = Record<string, unknown>;

// Integer centavos from the UI → exact peso strings for numeric(18,2) parameters.
const pesos = (value: unknown) => {
  if (!Number.isSafeInteger(value) || (value as number) <= 0)
    throw new Error("Enter a valid amount.");
  return ((value as number) / 100).toFixed(2);
};
const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Each workspace action and the database function that records it. */
const actions: Record<string, (args: Args, barangayId: string) => [string, Args]> = {
  addBudgetLine: (a, barangayId) => [
    "add_budget_line",
    {
      p_barangay_id: barangayId,
      p_code: text(a.code),
      p_name: text(a.name),
      p_category: text(a.category),
      p_appropriation: pesos(a.appropriation),
    },
  ],
  createCase: (a, barangayId) => [
    "create_expense_case",
    {
      p_barangay_id: barangayId,
      p_kind: text(a.kind),
      p_purpose: text(a.purpose),
      p_payee: text(a.payee),
      p_budget_line_id: text(a.budgetLineId),
      p_amount: pesos(a.amount),
    },
  ],
  advanceCase: (a) => ["advance_expense_case", { p_case_id: text(a.id) }],
  createVoucher: (a) => ["create_voucher", { p_case_id: text(a.id) }],
  submitVoucher: (a) => [
    "submit_voucher",
    { p_voucher_id: text(a.id), p_expected_version: a.version },
  ],
  approveVoucher: (a) => [
    "approve_voucher",
    { p_voucher_id: text(a.id), p_expected_version: a.version },
  ],
  rejectVoucher: (a) => [
    "reject_voucher",
    { p_voucher_id: text(a.id), p_expected_version: a.version },
  ],
  recordPayment: (a) => [
    "record_payment",
    { p_voucher_id: text(a.id), p_expected_version: a.version, p_reference: text(a.reference) },
  ],
  createCollection: (a, barangayId) => [
    "issue_collection",
    {
      p_barangay_id: barangayId,
      p_payer: text(a.payer),
      p_purpose: text(a.purpose),
      p_category: text(a.revenueCategory),
      p_amount: pesos(a.amount),
    },
  ],
  voidCollection: (a) => ["void_collection", { p_collection_id: text(a.id) }],
  openAdvance: (a) => ["open_cash_advance", { p_voucher_id: text(a.voucherId) }],
  recordLiquidation: (a) => [
    "record_liquidation",
    {
      p_advance_id: text(a.advanceId),
      p_kind: text(a.kind),
      p_description: text(a.description),
      p_amount: pesos(a.amount),
    },
  ],
  createDeposit: (a, barangayId) => [
    "confirm_deposit",
    {
      p_barangay_id: barangayId,
      p_kind: text(a.kind),
      p_bank: text(a.bank),
      p_reference: text(a.reference),
      // Sorted by receipt to match the function's lock ordering.
      p_allocations: (Array.isArray(a.allocations) ? a.allocations : [])
        .map((item: Args) => ({
          collection_id: text(item.collectionId),
          amount: pesos(item.amount),
        }))
        .sort((x, y) => x.collection_id.localeCompare(y.collection_id)),
    },
  ],
};

export async function POST(request: NextRequest) {
  const account = await currentAccount();
  if (!account || account.mode !== "supabase") return new NextResponse(null, { status: 404 });
  if (!canRecordLive(account.level))
    return NextResponse.json(
      { error: "Live records are read-only for your account." },
      { status: 403 },
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json({ error: "Send the request as JSON." }, { status: 415 });
  let body: Args;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request could not be read." }, { status: 400 });
  }
  const action = actions[text(body?.action)];
  if (!action)
    return NextResponse.json(
      { error: "This action is not available for live records yet." },
      { status: 400 },
    );
  const { active } = await getWorkspaceBarangays(account);
  if (!active) return NextResponse.json({ error: "Choose a barangay first." }, { status: 400 });

  let call: [string, Args];
  try {
    call = action(body.args && typeof body.args === "object" ? (body.args as Args) : {}, active.id);
  } catch (cause) {
    return NextResponse.json({ error: (cause as Error).message }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(call[0], call[1]);
  // Database messages are written for people (for example "Insufficient appropriation").
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: typeof data === "string" ? data : undefined });
}
