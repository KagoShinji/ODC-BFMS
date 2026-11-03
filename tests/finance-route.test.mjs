import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
const virtual = (source) => "data:text/javascript," + encodeURIComponent(source);
registerHooks({
  resolve(s, c, n) {
    const mocks = {
      "next/server":
        'export const NextResponse={json:(body,init)=>new Response(JSON.stringify(body),{...init,headers:{"content-type":"application/json"}})};',
      "@/lib/auth/session":
        "export async function currentAccount(){return globalThis.__financeRoute.account}",
      "@/lib/auth/active-barangay":
        "export async function getWorkspaceBarangays(){return {active:globalThis.__financeRoute.active}}",
      "@/lib/supabase/server":
        "export async function createClient(){return {rpc:async(...args)=>{globalThis.__financeRoute.calls.push(args);return globalThis.__financeRoute.result}}}",
    };
    return n(
      s in mocks
        ? virtual(mocks[s])
        : s.startsWith("@/")
          ? new URL("../src/" + s.slice(2) + ".ts", import.meta.url).href
          : s,
      c,
    );
  },
});
const { POST } = await import("../src/app/api/finance/route.ts");
function fixture() {
  return (globalThis.__financeRoute = {
    account: { mode: "supabase", level: "superadmin" },
    active: { id: "11111111-1111-4111-8111-111111111111" },
    calls: [],
    result: { data: { ok: true, id: "receipt-id" }, error: null },
  });
}
function request(body, withKey = true) {
  return new Request("http://localhost/api/finance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(withKey ? { "Idempotency-Key": "22222222-2222-4222-8222-222222222222" } : {}),
    },
    body: JSON.stringify(body),
  });
}
const payload = {
  action: "createCollection",
  args: {
    payer: "Payer",
    purpose: "Purpose",
    revenueCategory: "Other income",
    amount: 12345,
    barangayId: "spoofed",
  },
};
test("finance route binds replay keys, active barangay and exact amounts to the transactional RPC", async () => {
  const f = fixture();
  const result = await POST(request(payload));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).id, "receipt-id");
  assert.equal(f.calls[0][0], "execute_finance_action");
  const args = f.calls[0][1];
  assert.equal(args.p_barangay_id, f.active.id);
  assert.equal(args.p_arguments.p_barangay_id, f.active.id);
  assert.equal(args.p_arguments.p_amount, "123.45");
  assert.equal(args.p_request_id, "22222222-2222-4222-8222-222222222222");
});
test("finance route rejects missing keys and inherited action names without posting", async () => {
  const f = fixture();
  assert.equal((await POST(request(payload, false))).status, 400);
  assert.equal((await POST(request({ action: "constructor" }))).status, 400);
  assert.equal(f.calls.length, 0);
});
test("uncertain database errors preserve retry semantics while known rejections and missing migrations fail closed", async () => {
  const f = fixture();
  f.result = { data: null, error: { code: "", message: "Connection lost" } };
  assert.equal((await POST(request(payload))).status, 503);
  f.result = { data: null, error: { code: "P0001", message: "Insufficient appropriation" } };
  assert.equal((await POST(request(payload))).status, 400);
  f.result = { data: null, error: { code: "PGRST202", message: "Function missing" } };
  const missing = await POST(request(payload));
  assert.equal(missing.status, 400);
  assert.match((await missing.json()).error, /migration/);
  f.result = { data: null, error: null };
  assert.equal((await POST(request(payload))).status, 502);
});
test("replay boundary preserves existing staff restrictions and assigned approver/payment exceptions", async () => {
  const f = fixture();
  f.account = {
    mode: "supabase",
    level: "staff",
    memberships: [{ barangayId: f.active.id, role: "approver" }],
  };
  assert.equal((await POST(request(payload))).status, 403);
  assert.equal(f.calls.length, 0);
  assert.equal(
    (await POST(request({ action: "approveVoucher", args: { id: "voucher", version: 2 } }))).status,
    200,
  );
  f.account.memberships = [{ barangayId: f.active.id, role: "treasurer" }];
  assert.equal(
    (
      await POST(
        request({
          action: "recordPayment",
          args: { id: "voucher", version: 3, reference: "CHK-1" },
        }),
      )
    ).status,
    200,
  );
});
