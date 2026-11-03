import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { seedData } from "../src/data/demo/seed.ts";

// Match the app's TypeScript path alias for these plain data builders.
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier.startsWith("@/")
        ? new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href
        : specifier,
      context,
    );
  },
});
const builders = await import("../src/features/reports/financial-documents.ts");
const { dashboardTotals } = await import("../src/domain/finance.ts");
const { buildReports } = await import("../src/features/reports/report-data.ts");

test("audit exports retain performer name, email and account ID", () => {
  const document = builders.auditDocument([
    {
      ...seedData.audit[0],
      actor: "Auditor Person",
      actorEmail: "audit@example.test",
      actorId: "user-id",
    },
  ]);
  const record = Object.fromEntries(
    document.columns.map((column, i) => [column, document.rows[0][i]]),
  );
  assert.equal(record["Performed by"], "Auditor Person");
  assert.equal(record["Account email"], "audit@example.test");
  assert.equal(record["Account ID"], "user-id");
  assert.equal(document.columns.length, document.rows[0].length);
});

test("register exports include only the supplied filtered records", () => {
  const documents = [
    builders.budgetDocument(seedData, seedData.budgetLines.slice(0, 1)),
    builders.expenseRegister(seedData, seedData.expenseCases.slice(0, 1)),
    builders.voucherRegister(seedData, seedData.vouchers.slice(0, 1)),
    builders.collectionRegister(seedData, seedData.collections.slice(0, 1)),
  ];
  for (const document of documents) {
    assert.equal(document.rows.length, 1);
    assert.equal(document.rows[0].length, document.columns.length);
  }
});

test("individual copies preserve source references, payment status and voided status", () => {
  const paid = seedData.vouchers.find((item) => item.status === "paid");
  const voucher = builders.voucherDocument(seedData, paid);
  const fields = Object.fromEntries(voucher.fields);
  assert.equal(fields.Status, "PAID");
  assert.equal(fields["Payment reference"], paid.paymentReference);
  assert.equal(
    fields["Source case"],
    seedData.expenseCases.find((item) => item.id === paid.sourceCaseId)?.reference ?? "—",
  );
  const receipt = builders.collectionDocument(seedData, {
    ...seedData.collections[0],
    status: "voided",
  });
  assert.equal(Object.fromEntries(receipt.fields).Status, "VOIDED");
  assert.match(receipt.note, /VOIDED RECEIPT/);
  assert.match(receipt.note, /does not replace an official/);
  const expense = builders.expenseDocument(seedData, seedData.expenseCases[0]);
  assert.match(expense.note, /does not replace PR, RFQ, PO/);
});

test("deposit copies use each allocated amount, including a partial match", () => {
  const item = {
    ...seedData.deposits[0],
    amount: 2500,
    allocations: [{ collectionId: seedData.collections[0].id, amount: 2500 }],
  };
  const document = builders.depositDocument(seedData, item);
  assert.equal(document.rows[0][0], seedData.collections[0].receiptNumber);
  assert.equal(document.rows[0][2], "₱25.00");
  assert.equal(Object.fromEntries(document.fields)["Total amount"], "₱25.00");
});

test("liquidation copies include expenses and refunds and subtract both from outstanding", () => {
  const item = {
    id: "advance-test",
    voucherId: seedData.vouchers[0].id,
    accountablePerson: "Juan",
    amount: 10000,
    openedAt: "2026-10-31",
  };
  const data = {
    ...seedData,
    cashAdvances: [item],
    liquidationEntries: [
      {
        id: "expense",
        advanceId: item.id,
        kind: "expense",
        amount: 3000,
        description: "Travel",
        date: "2026-10-31",
      },
      {
        id: "refund",
        advanceId: item.id,
        kind: "refund",
        amount: 2000,
        description: "Cash returned",
        date: "2026-10-31",
      },
    ],
  };
  const document = builders.advanceDocument(data, item);
  assert.equal(Object.fromEntries(document.fields).Outstanding, "₱50.00");
  assert.deepEqual(
    document.rows.map((row) => row[1]),
    ["Accepted expense", "Cash refund"],
  );
  assert.equal(builders.advanceRegister(data).rows[0].at(-1), "₱50.00");
});

test("all available reports can export; pending templates remain excluded and live data is labelled correctly", () => {
  const reports = buildReports(seedData, false);
  assert.equal(reports.filter((item) => item.columns.length).length, 9);
  assert.deepEqual(
    reports.filter((item) => !item.columns.length).map((item) => item.id),
    ["pbc", "raaf", "transmittal"],
  );
  for (const report of reports) {
    for (const row of report.rows) assert.equal(row.length, report.columns.length);
  }
  const cashbook = reports.find((item) => item.id === "cashbook");
  assert.doesNotMatch(JSON.stringify(cashbook), /demo|synthetic/);
  assert.match(cashbook.description, /live records/);
});

test("cashbook retains original receipts, later dated voids, transfer legs and ledger balances", () => {
  const receipt = {
    ...seedData.collections[0],
    id: "receipt",
    receiptNumber: "OR-HISTORY",
    status: "voided",
    amount: 10000,
    date: "2026-01-01",
  };
  const data = {
    ...seedData,
    cashOpening: 0,
    bankOpening: 0,
    collections: [receipt],
    deposits: [{ ...seedData.deposits[0], id: "deposit" }],
    vouchers: [],
    liquidationEntries: [],
    cashbookEntries: [
      {
        id: "a",
        date: "2026-01-01",
        createdAt: "2026-01-01T08:00:00Z",
        sourceType: "collection",
        sourceId: "receipt",
        account: "cash",
        amount: 10000,
      },
      {
        id: "b",
        date: "2026-01-03",
        createdAt: "2026-01-03T08:00:00Z",
        sourceType: "collection_void",
        sourceId: "receipt",
        account: "cash",
        amount: -10000,
      },
      {
        id: "c",
        date: "2026-01-02",
        createdAt: "2026-01-02T08:00:00Z",
        sourceType: "deposit",
        sourceId: "deposit",
        account: "cash",
        amount: -5000,
      },
      {
        id: "d",
        date: "2026-01-02",
        createdAt: "2026-01-02T08:00:00Z",
        sourceType: "deposit",
        sourceId: "deposit",
        account: "bank",
        amount: 5000,
      },
    ],
  };
  const rows = buildReports(data, false).find((r) => r.id === "cashbook").rows;
  assert.equal(rows.length, 4, "opening plus collection, grouped transfer and void");
  assert.equal(rows[1][1], "OR-HISTORY");
  assert.equal(rows[1][5], "₱100.00");
  assert.match(rows[3][2], /Receipt void/);
  assert.equal(rows[3][5], "-₱50.00");
  assert.equal(rows[3][6], "₱50.00");
  const totals = dashboardTotals(data);
  assert.equal(totals.cash, -5000);
  assert.equal(totals.bank, 5000);
});

test("legacy demo void history is retained without inventing an unknown void date", () => {
  const data = {
    ...seedData,
    collections: [{ ...seedData.collections[0], status: "voided" }],
    vouchers: [],
    deposits: [],
    liquidationEntries: [],
    cashOpening: 0,
    bankOpening: 0,
  };
  const rows = buildReports(data, true).find((r) => r.id === "cashbook").rows;
  assert.equal(rows.length, 3);
  assert.equal(rows[2][0], "Date unavailable");
  assert.match(rows[2][2], /void date not recorded/);
  assert.equal(rows[2][5], "₱0.00");
  const dated = { ...data, collections: [{ ...data.collections[0], voidedAt: "2026-11-03" }] };
  assert.notEqual(
    buildReports(dated, true).find((r) => r.id === "cashbook").rows[2][0],
    "Date unavailable",
  );
});
