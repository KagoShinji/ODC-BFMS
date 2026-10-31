import test from "node:test";
import assert from "node:assert/strict";
import { renderPrintDocument, printDocuments } from "../src/lib/print-document.ts";
import { defaultBranding } from "../src/lib/branding.ts";

const identity = {
  barangay: "Barangay San Isidro",
  fiscalYear: 2026,
  branding: { ...defaultBranding, logoUrl: "https://assets.example.ph/san-isidro.png" },
  demo: false,
  generatedAt: new Date("2026-10-31T16:05:00Z"),
};
const report = { title: "RAO", columns: ["Account", "Amount"], rows: [["MOOE", "₱1,000.00"]] };

test("PDF document includes the selected barangay, its logo, values, year and Manila timestamp", () => {
  const html = renderPrintDocument([report], identity);
  assert.match(html, /<h1>Barangay San Isidro<\/h1>/);
  assert.match(html, /src="https:\/\/assets.example.ph\/san-isidro.png"/);
  assert.match(html, /Fiscal year 2026 · Live records/);
  assert.match(html, /Nov 1, 2026/);
  assert.match(html, /12:05 AM/);
  assert.match(html, /₱1,000.00/);
  const other = renderPrintDocument([report], {
    ...identity,
    barangay: "Barangay Mabini",
    branding: { ...identity.branding, logoUrl: "https://assets.example.ph/mabini.png" },
  });
  assert.match(other, /Barangay Mabini/);
  assert.match(other, /mabini.png/);
  assert.doesNotMatch(other, /San Isidro|san-isidro.png/);
});

test("PDF content escapes stored fields, notes and attribute values", () => {
  const attack = '<script>alert("x")</script>';
  const html = renderPrintDocument(
    [
      {
        title: attack,
        description: attack,
        columns: [attack],
        rows: [[attack]],
        fields: [[attack, attack]],
        note: attack,
      },
    ],
    {
      ...identity,
      barangay: attack,
      branding: {
        ...identity.branding,
        logoUrl: 'https://assets.example.ph/logo.png" onerror="alert(1)',
      },
    },
  );
  assert.doesNotMatch(html, /<script>|" onerror="/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&quot; onerror=&quot;/);
});

test("missing or unsafe logos use a text mark and demo copies are clearly labelled", () => {
  for (const logoUrl of ["", "javascript:alert(1)", "http://example.ph/logo.png"]) {
    const html = renderPrintDocument([report], {
      ...identity,
      demo: true,
      branding: { ...defaultBranding, logoUrl },
    });
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /class="mark"/);
    assert.match(html, /DEMO — sample records/);
  }
});

test("batch reports have a header per document, page breaks and landscape for wide tables", () => {
  const html = renderPrintDocument(
    [
      report,
      { ...report, title: "Cashbook", columns: ["1", "2", "3", "4", "5", "6", "7"], rows: [] },
    ],
    identity,
  );
  assert.equal((html.match(/<article>/g) ?? []).length, 2);
  assert.equal((html.match(/<header>/g) ?? []).length, 2);
  assert.match(html, /article \+ article \{ break-before: page/);
  assert.match(html, /size: A4 landscape/);
  assert.match(html, /No records for this document/);
  assert.match(html, /table-header-group/);
  assert.throws(() => renderPrintDocument([], identity), /Choose at least one/);
});

test("print waits for logo decode, prints only the isolated frame, and cleans up", async () => {
  const original = globalThis.document;
  const calls = [];
  let afterPrint;
  const frame = {
    style: {},
    setAttribute() {},
    remove() {
      calls.push("remove");
    },
    contentDocument: {
      images: [
        {
          complete: true,
          naturalWidth: 72,
          async decode() {
            calls.push("decode");
          },
        },
      ],
    },
    contentWindow: {
      addEventListener(name, callback) {
        if (name === "afterprint") afterPrint = callback;
      },
      focus() {
        calls.push("focus");
      },
      print() {
        calls.push("print");
        afterPrint();
      },
    },
  };
  globalThis.document = {
    createElement() {
      return frame;
    },
    body: {
      appendChild(item) {
        queueMicrotask(() => item.onload());
      },
    },
  };
  try {
    await printDocuments([report], identity);
    assert.deepEqual(calls, ["decode", "focus", "print"]);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.equal(calls.at(-1), "remove");
  } finally {
    globalThis.document = original;
  }
});

test("a failed logo load blocks printing and removes the frame", async () => {
  const original = globalThis.document;
  let printed = false;
  let removed = false;
  const frame = {
    style: {},
    setAttribute() {},
    remove() {
      removed = true;
    },
    contentDocument: { images: [{ complete: true, naturalWidth: 0 }] },
    contentWindow: {
      print() {
        printed = true;
      },
    },
  };
  globalThis.document = {
    createElement() {
      return frame;
    },
    body: {
      appendChild(item) {
        queueMicrotask(() => item.onload());
      },
    },
  };
  try {
    await assert.rejects(printDocuments([report], identity), /barangay logo could not be loaded/);
    assert.equal(printed, false);
    assert.equal(removed, true);
  } finally {
    globalThis.document = original;
  }
});
