import test from "node:test";
import assert from "node:assert/strict";
import {
  createDemoSession,
  DEMO_SESSION_MAX_AGE,
  verifyDemoSession,
} from "../src/lib/auth/demo-session.ts";

test("demo session accepts a valid signed token and rejects tampering", () => {
  const now = 1_800_000_000_000;
  const token = createDemoSession(now);
  assert.equal(verifyDemoSession(token, now + 5_000), true);
  const last = token.at(-1);
  assert.equal(
    verifyDemoSession(`${token.slice(0, -1)}${last === "a" ? "b" : "a"}`, now + 5_000),
    false,
  );
  assert.equal(verifyDemoSession(undefined, now), false);
});

test("demo session expires and future-issued tokens are rejected", () => {
  const now = 1_800_000_000_000;
  const token = createDemoSession(now);
  assert.equal(verifyDemoSession(token, now + DEMO_SESSION_MAX_AGE * 1_000), false);
  assert.equal(verifyDemoSession(token, now - 31_000), false);
});
