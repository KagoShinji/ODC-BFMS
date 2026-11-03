import test from "node:test";
import assert from "node:assert/strict";
import { createFinanceRequester } from "../src/lib/finance-request.ts";
const memory = () => {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
};
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });

test("uncertain committed submissions reuse their ID after requester recreation", async () => {
  const storage = memory();
  const ids = [];
  let committed = 0;
  const posted = new Map();
  let drop = true;
  const fetch = async (_url, options) => {
    const id = options.headers["Idempotency-Key"];
    ids.push(id);
    if (!posted.has(id)) {
      committed++;
      posted.set(id, "receipt-1");
    }
    if (drop) {
      drop = false;
      throw Error("response lost after commit");
    }
    return response({ ok: true, id: posted.get(id) });
  };
  const first = createFinanceRequester("user:barangay", { fetch, storage: () => storage });
  assert.equal((await first("createCollection", { amount: 10000, payer: "Test payer" })).ok, false);
  const retry = createFinanceRequester("user:barangay", { fetch, storage: () => storage });
  assert.deepEqual(await retry("createCollection", { payer: "Test payer", amount: 10000 }), {
    ok: true,
    id: "receipt-1",
  });
  assert.equal(committed, 1);
  assert.equal(ids[0], ids[1]);
  await retry("createCollection", { payer: "Test payer", amount: 10000 });
  assert.notEqual(ids[1], ids[2]);
  assert.equal(committed, 2, "a confirmed new submission is allowed");
});

test("simultaneous identical submissions make one request; scopes and payloads remain distinct", async () => {
  const ids = [];
  let release;
  let entered;
  const started = new Promise((resolve) => (entered = resolve));
  const gate = new Promise((resolve) => (release = resolve));
  const fetch = async (_url, options) => {
    ids.push(options.headers["Idempotency-Key"]);
    entered();
    await gate;
    return response({ ok: true, id: "created" });
  };
  const storage = memory();
  const request = createFinanceRequester("a:one", { fetch, storage: () => storage });
  const a = request("createCase", { amount: 100 });
  const b = request("createCase", { amount: 100 });
  await started;
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(ids.length, 1);
  release();
  await Promise.all([a, b]);
  const uncertain = async (_url, options) => {
    ids.push(options.headers["Idempotency-Key"]);
    return response({ error: "uncertain" }, 503);
  };
  const scoped = createFinanceRequester("a:one", { fetch: uncertain, storage: () => storage });
  await scoped("createCase", { amount: 100 });
  await scoped("createCase", { amount: 200 });
  await createFinanceRequester("b:two", { fetch: uncertain, storage: () => storage })(
    "createCase",
    { amount: 100 },
  );
  assert.equal(new Set(ids).size, 4);
});

test("server failures and malformed success responses keep the original request ID", async () => {
  const ids = [];
  let call = 0;
  const request = createFinanceRequester("a:b", {
    storage: () => memory(),
    fetch: async (_url, options) => {
      ids.push(options.headers["Idempotency-Key"]);
      call++;
      return call === 1
        ? response({ error: "try again" }, 503)
        : call === 2
          ? new Response("<html>proxy response</html>", { status: 200 })
          : response({ ok: true });
    },
  });
  assert.equal((await request("advanceCase", { id: "case" })).ok, false);
  assert.equal((await request("advanceCase", { id: "case" })).ok, false);
  assert.equal((await request("advanceCase", { id: "case" })).ok, true);
  assert.equal(new Set(ids).size, 1);
});

test("rejected retries retain their ID; corrected values use a new ID even without browser storage", async () => {
  const ids = [];
  let call = 0;
  const request = createFinanceRequester("a:b", {
    storage: () => {
      throw Error("storage unavailable");
    },
    fetch: async (_url, options) => {
      ids.push(options.headers["Idempotency-Key"]);
      call++;
      return response({ error: "rejected" }, call === 1 ? 400 : 503);
    },
  });
  await request("createCollection", { amount: 100 });
  await request("createCollection", { amount: 100 });
  await request("createCollection", { amount: 100 });
  assert.equal(ids[0], ids[1]);
  assert.equal(ids[1], ids[2]);
  await request("createCollection", { amount: 200 });
  assert.notEqual(ids[2], ids[3]);
});

test("whitespace and allocation order cannot turn an uncertain deposit retry into a second submission", async () => {
  const storage = memory();
  const calls = [];
  let drop = true;
  const fetch = async (_url, options) => {
    calls.push({ id: options.headers["Idempotency-Key"], body: JSON.parse(options.body) });
    if (drop) {
      drop = false;
      throw Error("lost response");
    }
    return response({ ok: true, id: "original-deposit" });
  };
  const original = {
    reference: " BANK-001 ",
    bank: " Test Bank ",
    allocations: [
      { collectionId: "b", amount: 100 },
      { collectionId: "a", amount: 200 },
    ],
  };
  await createFinanceRequester("user:barangay", { fetch, storage: () => storage })(
    "createDeposit",
    original,
  );
  await createFinanceRequester("user:barangay", { fetch, storage: () => storage })(
    "createDeposit",
    {
      bank: "Test Bank",
      reference: "BANK-001",
      allocations: [
        { collectionId: "a", amount: 200 },
        { collectionId: "b", amount: 100 },
      ],
    },
  );
  assert.equal(calls[0].id, calls[1].id);
  assert.deepEqual(calls[0].body, calls[1].body);
  assert.equal(original.allocations[0].collectionId, "b", "normalization does not mutate the form");
});
