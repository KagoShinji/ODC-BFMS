import test from "node:test";
import assert from "node:assert/strict";
import {
  createDemoSession,
  DEMO_SESSION_MAX_AGE,
  verifyDemoSession,
} from "../src/lib/auth/demo-session.ts";
import {
  assignableRoles,
  canManageBranding,
  canManageRole,
  canManageStaff,
  validateNewStaff,
} from "../src/lib/auth/roles.ts";

test("demo session accepts a valid signed token and rejects tampering", () => {
  const now = 1_800_000_000_000;
  const token = createDemoSession("admin", now);
  assert.deepEqual(verifyDemoSession(token, now + 5_000), { level: "admin" });
  const last = token.at(-1);
  assert.equal(
    verifyDemoSession(`${token.slice(0, -1)}${last === "a" ? "b" : "a"}`, now + 5_000),
    null,
  );
  assert.equal(verifyDemoSession(undefined, now), null);
});

test("demo session access level cannot be changed without re-signing", () => {
  const now = 1_800_000_000_000;
  const token = createDemoSession("staff", now);
  assert.equal(verifyDemoSession(token.replace(".staff.", ".superadmin."), now), null);
  assert.equal(verifyDemoSession(token.replace(".staff.", ".owner."), now), null);
});

test("demo session expires and future-issued tokens are rejected", () => {
  const now = 1_800_000_000_000;
  const token = createDemoSession("superadmin", now);
  assert.equal(verifyDemoSession(token, now + DEMO_SESSION_MAX_AGE * 1_000), null);
  assert.equal(verifyDemoSession(token, now - 31_000), null);
});

test("white labeling is exclusive to super admins", () => {
  assert.equal(canManageBranding("superadmin"), true);
  assert.equal(canManageBranding("admin"), false);
  assert.equal(canManageBranding("staff"), false);
});

test("admins manage staff roles but only super admins manage administrators", () => {
  assert.equal(canManageStaff("superadmin"), true);
  assert.equal(canManageStaff("admin"), true);
  assert.equal(canManageStaff("staff"), false);
  assert.ok(assignableRoles("superadmin").includes("admin"));
  assert.ok(!assignableRoles("admin").includes("admin"));
  assert.ok(assignableRoles("admin").includes("treasurer"));
  assert.deepEqual(assignableRoles("staff"), []);
  assert.equal(canManageRole("admin", "admin"), false);
  assert.equal(canManageRole("admin", "collector"), true);
});

test("new staff input is validated against the caller's access level", () => {
  const input = { fullName: "Juan Dela Cruz", email: "juan@example.gov.ph", role: "encoder" };
  assert.equal(validateNewStaff(input, "admin", { requirePassword: false }), null);
  assert.match(
    validateNewStaff({ ...input, role: "admin" }, "admin", { requirePassword: false }),
    /super admin/,
  );
  assert.equal(
    validateNewStaff({ ...input, role: "admin" }, "superadmin", { requirePassword: false }),
    null,
  );
  assert.match(
    validateNewStaff({ ...input, email: "juan" }, "admin", { requirePassword: false }),
    /email/,
  );
  assert.match(
    validateNewStaff({ ...input, role: "owner" }, "superadmin", { requirePassword: false }),
    /role/,
  );
  assert.match(validateNewStaff(input, "admin", { requirePassword: true }), /password/);
  assert.equal(
    validateNewStaff({ ...input, password: "a-long-temporary-pass" }, "admin", {
      requirePassword: true,
    }),
    null,
  );
});
