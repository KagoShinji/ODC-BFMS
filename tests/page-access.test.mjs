import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canAccessPath,
  configurablePages,
  defaultPagesForRoles,
  effectivePages,
  landingPage,
  pageForPath,
  pagesForBarangay,
  rolePageDefaults,
  validPageSelection,
} from "../src/lib/auth/page-access.ts";
import { staffRoles } from "../src/lib/auth/roles.ts";

test("role defaults distinguish collector, procurement, approver and auditor pages", () => {
  const collector = effectivePages("staff", ["collector"]);
  assert.ok(collector.includes("collections"));
  assert.ok(collector.includes("deposits"));
  assert.ok(!collector.includes("procurement"));
  assert.ok(!collector.includes("disbursements"));
  assert.ok(!collector.includes("audit"));
  const procurement = effectivePages("staff", ["procurement"]);
  assert.ok(procurement.includes("procurement"));
  assert.ok(!procurement.includes("payroll"));
  assert.ok(!procurement.includes("disbursements"));
  assert.ok(effectivePages("staff", ["approver"]).includes("disbursements"));
  assert.ok(effectivePages("staff", ["auditor"]).includes("audit"));
  for (const role of staffRoles) {
    assert.ok(validPageSelection(defaultPagesForRoles([role])));
    assert.ok(!effectivePages("staff", [role]).includes("staff"));
    assert.ok(!effectivePages("staff", [role]).includes("branding"));
  }
});

test("custom access replaces defaults, including additions and an explicitly empty selection", () => {
  assert.deepEqual(effectivePages("staff", ["procurement"], ["collections"]), [
    "collections",
    "settings",
  ]);
  assert.deepEqual(effectivePages("staff", ["auditor"], []), ["settings"]);
  assert.ok(effectivePages("staff", ["collector"], null).includes("collections"));
  assert.ok(!effectivePages("staff", ["collector"], ["reports"]).includes("collections"));
});

test("active roles combine only while following role defaults", () => {
  const combined = defaultPagesForRoles(["collector", "approver"]);
  assert.ok(combined.includes("collections"));
  assert.ok(combined.includes("disbursements"));
  assert.equal(new Set(combined).size, combined.length);
  assert.deepEqual(effectivePages("staff", ["collector", "approver"], ["travel"]), [
    "travel",
    "settings",
  ]);
});

test("custom pages cannot grant privileged management pages or unknown routes", () => {
  for (const value of [
    ["staff"],
    ["branding"],
    ["settings"],
    ["/collections"],
    ["collections", "collections"],
    [null],
    "collections",
    null,
    {},
  ])
    assert.equal(validPageSelection(value), false);
  assert.equal(validPageSelection([]), true);
  assert.equal(validPageSelection(["audit", "collections"]), true);
  assert.ok(effectivePages("admin", ["admin"], []).includes("staff"));
  assert.ok(!effectivePages("admin", ["admin"], []).includes("branding"));
  assert.equal(effectivePages("superadmin", [], []).length, configurablePages.length + 3);
});

test("super admin access covers every page despite empty overrides and no barangay membership", () => {
  const account = {
    mode: "supabase",
    level: "superadmin",
    adminBarangayIds: [],
    barangayIds: [],
    memberships: [],
    pageOverrides: { a: { pages: [], version: 1 } },
  };
  for (const barangay of ["a", "b"]) {
    const pages = pagesForBarangay(account, barangay);
    for (const page of configurablePages)
      assert.equal(canAccessPath(pages, page.href), true, `${barangay}: ${page.key}`);
    for (const path of ["/staff", "/settings", "/branding"])
      assert.equal(canAccessPath(pages, path), true);
  }
});

test("barangay selection keeps custom grants and administrator roles scoped", () => {
  const account = {
    mode: "supabase",
    level: "admin",
    adminBarangayIds: ["a"],
    barangayIds: ["a", "b"],
    memberships: [
      { barangayId: "a", role: "admin" },
      { barangayId: "b", role: "collector" },
    ],
    pageOverrides: { a: { pages: ["budget"], version: 1 }, b: { pages: ["travel"], version: 2 } },
  };
  assert.ok(pagesForBarangay(account, "a").includes("budget"));
  assert.ok(!pagesForBarangay(account, "b").includes("budget"));
  assert.ok(pagesForBarangay(account, "b").includes("travel"));
  // Staff management has a separate selector limited to the account's administered barangays.
  assert.ok(pagesForBarangay(account, "b").includes("staff"));
  assert.deepEqual(
    pagesForBarangay(
      { ...account, level: "staff", adminBarangayIds: [], pageOverrides: {} },
      "missing",
    ),
    ["settings"],
  );
});

test("URL checks match exact pages and handle query strings and trailing slashes", () => {
  const pages = effectivePages("staff", ["collector"]);
  assert.equal(canAccessPath(pages, "/collections?search=test"), true);
  assert.equal(canAccessPath(pages, "/collections/"), true);
  assert.equal(canAccessPath(pages, "/collections/extra"), false);
  assert.equal(canAccessPath(pages, "/workflows/procurement"), false);
  assert.equal(pageForPath("/workflows/unknown"), null);
  assert.equal(pageForPath("/disbursements?selected=123"), "disbursements");
  assert.equal(landingPage(["collections", "settings"]), "/collections");
  assert.equal(landingPage(["settings"]), "/settings");
});

test("database and application role defaults stay aligned", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/202611030001_account_page_access.sql", import.meta.url),
    "utf8",
  );
  for (const [role, pages] of Object.entries(rolePageDefaults)) {
    const match = sql.match(new RegExp(`when '${role}' then array\\[([^\\]]+)\\]`));
    assert.ok(match, role);
    const stored = [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
    assert.deepEqual([...stored].sort(), [...pages].sort(), role);
  }
});
