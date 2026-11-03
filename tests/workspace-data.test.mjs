import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({
  resolve(s, c, n) {
    return n(
      s.startsWith("@/") ? new URL("../src/" + s.slice(2) + ".ts", import.meta.url).href : s,
      c,
    );
  },
});
const { loadFinanceData } = await import("../src/data/supabase/workspace-data.ts");
const { readAllRows } = await import("../src/data/supabase/read-all.ts");
function client({ failTable, throwTable, ledger = [], cap = 500 } = {}) {
  const filters = [];
  let auditCalls = 0;
  return {
    filters,
    get auditCalls() {
      return auditCalls;
    },
    rpc: async () => {
      auditCalls++;
      return { data: [], error: null };
    },
    from(table) {
      const rows = table === "cashbook_entries" ? ledger : [];
      const q = {
        select() {
          return q;
        },
        eq(key, value) {
          filters.push({ table, key, value });
          return q;
        },
        order() {
          return q;
        },
        async range(from, to) {
          if (table === throwTable) throw Error("offline");
          return table === failTable
            ? { data: null, error: { message: "Simulated query failure" } }
            : { data: rows.slice(from, Math.min(to + 1, from + cap)), error: null };
        },
      };
      return q;
    },
  };
}
for (const table of ["cash_advances", "liquidation_entries", "cashbook_entries"]) {
  test(`${table} failures are reported instead of appearing as valid empty balances`, async () => {
    const result = await loadFinanceData(client({ failTable: table }), {
      id: "barangay-a",
      name: "Test",
    });
    assert.match(result.error, /could not be loaded/);
  });
}
test("network rejection is surfaced and audit reads are skipped without the audit page", async () => {
  const db = client({ throwTable: "liquidation_entries" });
  const result = await loadFinanceData(db, { id: "barangay-a", name: "Test" }, [
    "dashboard",
    "advances",
  ]);
  assert.ok(result.error);
  assert.equal(db.auditCalls, 0);
});
test("posted history loads beyond the server row cap and remains scoped to the barangay", async () => {
  const ledger = Array.from({ length: 1203 }, (_, i) => ({
    id: "row-" + i,
    business_date: "2025-12-31",
    created_at: "2025-12-31T10:00:00Z",
    source_type: "collection",
    source_id: "receipt-" + i,
    account: "cash",
    amount: "1.25",
  }));
  const db = client({ ledger, cap: 100 });
  const result = await loadFinanceData(db, { id: "barangay-a", name: "Test" });
  assert.equal(result.error, undefined);
  assert.equal(result.data.cashbookEntries.length, 1203);
  assert.equal(result.data.cashbookEntries[1202].amount, 125);
  assert.ok(
    db.filters
      .filter((f) => f.table === "cashbook_entries")
      .every((f) => f.key === "barangay_id" && f.value === "barangay-a"),
  );
});
test("a later-page failure discards partial results", async () => {
  let call = 0;
  const result = await readAllRows(async () =>
    ++call === 1
      ? { data: [{ id: 1 }], error: null }
      : { data: null, error: { message: "later failure" } },
  );
  assert.deepEqual(result.data, []);
  assert.ok(result.error);
});
