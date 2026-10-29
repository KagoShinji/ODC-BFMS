import test from "node:test";
import assert from "node:assert/strict";
import { workspaceNotifications, notificationReadIds } from "../src/lib/notifications.ts";
import { seedData } from "../src/data/demo/seed.ts";

const emptyData = () => ({
  ...structuredClone(seedData),
  vouchers: [],
  collections: [],
  deposits: [],
  cashAdvances: [],
  liquidationEntries: [],
  audit: [],
});

test("notifications only include actionable vouchers and change identity when work advances", () => {
  const data = emptyData();
  const voucher = structuredClone(seedData.vouchers[0]);
  data.vouchers = [voucher];
  voucher.status = "draft";
  assert.deepEqual(workspaceNotifications(data), []);
  voucher.status = "submitted";
  const [review] = workspaceNotifications(data);
  assert.equal(review.kind, "review");
  assert.equal(review.href, `/disbursements?selected=${voucher.id}`);
  voucher.status = "approved";
  voucher.version++;
  const [payment] = workspaceNotifications(data);
  assert.equal(payment.kind, "payment");
  assert.notEqual(payment.id, review.id);
  voucher.status = "paid";
  assert.deepEqual(workspaceNotifications(data), []);
});

test("receipt notifications track the unmatched balance across deposits and remittances", () => {
  const data = emptyData();
  data.collections = [
    { ...structuredClone(seedData.collections[0]), amount: 10000, status: "issued" },
  ];
  const receipt = data.collections[0];
  const deposit = {
    id: "d",
    kind: "deposit",
    status: "confirmed",
    allocations: [{ collectionId: receipt.id, amount: 4000 }],
  };
  data.deposits = [deposit];
  const [partial] = workspaceNotifications(data);
  assert.equal(partial.amount, 6000);
  data.deposits.push({
    ...deposit,
    id: "r",
    kind: "remittance",
    allocations: [{ collectionId: receipt.id, amount: 6000 }],
  });
  assert.deepEqual(workspaceNotifications(data), []);
  data.deposits = [];
  receipt.status = "voided";
  assert.deepEqual(workspaceNotifications(data), []);
});

test("advance notifications clear after expenses and refunds settle the advance", () => {
  const data = emptyData();
  data.cashAdvances = [
    {
      id: "a",
      voucherId: "v",
      accountablePerson: "Sample person",
      amount: 10000,
      openedAt: "2026-10-30",
    },
  ];
  data.liquidationEntries = [{ id: "e", advanceId: "a", kind: "expense", amount: 7000 }];
  assert.equal(workspaceNotifications(data)[0].amount, 3000);
  data.liquidationEntries.push({ id: "r", advanceId: "a", kind: "refund", amount: 3000 });
  assert.deepEqual(workspaceNotifications(data), []);
});

test("recent activity is capped, newest first, and follows pending work", () => {
  const data = emptyData();
  data.vouchers = [{ ...seedData.vouchers[0], status: "submitted" }];
  data.audit = Array.from({ length: 12 }, (_, index) => ({
    id: String(index),
    action: "Record updated",
    subject: "Sample",
    detail: "Sample activity",
    at: `2026-10-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
  }));
  const result = workspaceNotifications(data);
  assert.equal(result.length, 11);
  assert.equal(result[0].kind, "review");
  assert.equal(result[1].id, "activity:11");
  assert.equal(result[10].id, "activity:2");
});

test("corrupt notification storage is ignored and read ids are bounded", () => {
  assert.deepEqual(notificationReadIds(null), []);
  assert.deepEqual(notificationReadIds("invalid json"), []);
  assert.deepEqual(notificationReadIds('{"bad":true}'), []);
  assert.deepEqual(notificationReadIds('["a",null,5,"b"]'), ["a", "b"]);
  assert.equal(
    notificationReadIds(JSON.stringify(Array.from({ length: 2100 }, (_, i) => String(i)))).length,
    2000,
  );
});
