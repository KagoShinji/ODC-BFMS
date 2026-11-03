import test from "node:test";
import assert from "node:assert/strict";
import { receiptMatching } from "../src/domain/matching.ts";
import { receiptUnmatched } from "../src/domain/finance.ts";
import { seedData } from "../src/data/demo/seed.ts";
const receipt = {
  ...seedData.collections[0],
  id: "receipt-600",
  receiptNumber: "OR-600",
  status: "issued",
  amount: 60000,
};
function batch(id, kind, amount, collectionId = receipt.id) {
  return { ...seedData.deposits[0], id, kind, amount, allocations: [{ collectionId, amount }] };
}

test("a confirmed 400 deposit against a 600 receipt shows 200 remaining and partial receipt status", () => {
  const data = { collections: [receipt], deposits: [batch("deposit", "deposit", 40000)] };
  const [match] = receiptMatching(data);
  assert.equal(match.matched, 40000);
  assert.equal(match.remaining, 20000);
  assert.equal(match.status, "partial");
  assert.equal(match.percent, (40000 / 60000) * 100);
  assert.equal(
    data.deposits[0].status,
    "confirmed",
    "batch status remains independent of receipt progress",
  );
  assert.equal(match.remaining, receiptUnmatched(data, receipt.id));
});
test("later remittances complete progress across batches without changing the original receipt amount", () => {
  const data = {
    collections: [receipt],
    deposits: [batch("deposit", "deposit", 40000), batch("remit", "remittance", 20000)],
  };
  const [match] = receiptMatching(data);
  assert.equal(match.matched, 60000);
  assert.equal(match.remaining, 0);
  assert.equal(match.status, "matched");
  assert.equal(match.percent, 100);
  assert.equal(match.receipt.amount, 60000);
  assert.equal(data.deposits[0].amount, 40000, "historical batch amount remains unchanged");
});
test("receipt progress stays separate for each allocation in a multi-receipt batch and excludes voids", () => {
  const second = { ...receipt, id: "second", amount: 10000 };
  const voided = { ...receipt, id: "voided", status: "voided" };
  const deposit = {
    ...batch("multi", "deposit", 45000),
    allocations: [
      { collectionId: receipt.id, amount: 40000 },
      { collectionId: second.id, amount: 5000 },
    ],
  };
  const data = {
    collections: [receipt, second, voided, { ...receipt, id: "untouched" }],
    deposits: [deposit],
  };
  const original = structuredClone(data);
  const matches = receiptMatching(data);
  assert.equal(matches.length, 3);
  assert.deepEqual(
    matches.map((m) => m.remaining),
    [20000, 5000, 60000],
  );
  assert.equal(matches[2].status, "unmatched");
  assert.equal(matches[2].percent, 0);
  assert.deepEqual(data, original);
});
