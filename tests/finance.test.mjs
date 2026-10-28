import test from "node:test";
import assert from "node:assert/strict";
import { seedData } from "../src/data/demo/seed.ts";
import {
  availableForLine,
  canSubmitVoucher,
  dashboardTotals,
  nextNumber,
  parseMoney,
  receiptUnmatched,
} from "../src/domain/finance.ts";

test("money entry accepts exact centavos and rejects excess precision", () => {
  assert.equal(parseMoney("1,234.56"), 123456);
  assert.equal(parseMoney("12.5"), 1250);
  assert.equal(parseMoney("0.001"), null);
  assert.equal(parseMoney("-50"), null);
});

test("budget submission uses committed vouchers, not drafts", () => {
  assert.equal(availableForLine(seedData, "b4"), 60000000);
  const draft = seedData.vouchers.find((voucher) => voucher.id === "v4");
  assert.equal(canSubmitVoucher(seedData, draft), null);
  const overBudget = { ...draft, amount: 60000001 };
  assert.match(canSubmitVoucher(seedData, overBudget), /insufficient/);
});

test("deposit matching moves cash once without changing collected revenue", () => {
  const baseline = dashboardTotals(seedData);
  assert.equal(baseline.collected, 42500);
  assert.equal(baseline.deposited, 5000);
  assert.equal(receiptUnmatched(seedData, "c1"), 0);
  assert.equal(receiptUnmatched(seedData, "c2"), 7500);
  const updated = {
    ...seedData,
    deposits: [
      ...seedData.deposits,
      {
        id: "d2",
        number: "DEP-2026-002",
        kind: "deposit",
        bank: "Land Bank",
        reference: "test",
        date: "2026-10-28",
        amount: 3000,
        allocations: [{ collectionId: "c2", amount: 3000 }],
        status: "confirmed",
      },
    ],
  };
  const after = dashboardTotals(updated);
  assert.equal(after.collected, baseline.collected);
  assert.equal(after.cash, baseline.cash - 3000);
  assert.equal(after.bank, baseline.bank + 3000);
  assert.equal(receiptUnmatched(updated, "c2"), 4500);
});

test("document numbering advances within the year", () => {
  assert.equal(
    nextNumber("DV", ["DV-2026-001", "DV-2026-009", "DV-2025-042"], 2026),
    "DV-2026-010",
  );
});

test("remittance settles a receipt without increasing bank cash", () => {
  const baseline = dashboardTotals(seedData);
  const updated = {
    ...seedData,
    deposits: [
      ...seedData.deposits,
      {
        id: "r1",
        number: "REM-2026-001",
        kind: "remittance",
        bank: "Municipal Treasury",
        reference: "MTO-001",
        date: "2026-10-28",
        amount: 7500,
        allocations: [{ collectionId: "c2", amount: 7500 }],
        status: "confirmed",
      },
    ],
  };
  const after = dashboardTotals(updated);
  assert.equal(after.remitted, 7500);
  assert.equal(after.bank, baseline.bank);
  assert.equal(after.cash, baseline.cash - 7500);
  assert.equal(after.collected, baseline.collected);
  assert.equal(receiptUnmatched(updated, "c2"), 0);
});

test("advance liquidation and refund settle liability without a second expense or revenue", () => {
  const advance = {
    id: "advance-1",
    voucherId: "v3",
    accountablePerson: "Demo",
    amount: 40000,
    openedAt: "2026-10-28",
  };
  const updated = {
    ...seedData,
    cashAdvances: [advance],
    liquidationEntries: [
      {
        id: "entry-1",
        advanceId: advance.id,
        kind: "expense",
        description: "Receipt",
        amount: 30000,
        date: "2026-10-28",
      },
      {
        id: "entry-2",
        advanceId: advance.id,
        kind: "refund",
        description: "Returned balance",
        amount: 10000,
        date: "2026-10-28",
      },
    ],
  };
  const baseline = dashboardTotals(seedData);
  const after = dashboardTotals(updated);
  assert.equal(after.advanceOutstanding, 0);
  assert.equal(after.paid, baseline.paid);
  assert.equal(after.collected, baseline.collected);
  assert.equal(after.cash, baseline.cash + 10000);
});
