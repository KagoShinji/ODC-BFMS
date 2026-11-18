import test from "node:test";
import assert from "node:assert/strict";
import {
  formatKeepaliveSource,
  resolveKeepaliveConfig,
  runKeepalive,
} from "../scripts/supabase-keepalive.mjs";

function createMockSupabase({ readResult, writeResult }) {
  const recorded = { upsertArgs: null };

  const client = {
    from(table) {
      assert.equal(table, "supabase_keepalive");
      return {
        select(columns) {
          assert.equal(columns, "ping_count");
          return {
            eq(column, value) {
              assert.equal(column, "id");
              assert.equal(value, "github-actions");
              return {
                async maybeSingle() {
                  return readResult;
                },
              };
            },
          };
        },
        upsert(payload, options) {
          recorded.upsertArgs = { payload, options };
          return {
            select() {
              return {
                async single() {
                  return (
                    writeResult ?? {
                      data: payload,
                      error: null,
                    }
                  );
                },
              };
            },
          };
        },
      };
    },
  };

  return { client, recorded };
}

test("resolveKeepaliveConfig validates URL and secret key and supports fallbacks", () => {
  assert.deepEqual(
    resolveKeepaliveConfig({
      NEXT_PUBLIC_SUPABASE_URL: " https://example.supabase.co/ ",
      SUPABASE_SECRET_KEY: " sb_secret_test ",
    }),
    { url: "https://example.supabase.co", secretKey: "sb_secret_test" },
  );

  assert.deepEqual(
    resolveKeepaliveConfig({
      SUPABASE_URL: "https://fallback.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-jwt-key",
    }),
    { url: "https://fallback.supabase.co", secretKey: "legacy-jwt-key" },
  );

  assert.throws(
    () => resolveKeepaliveConfig({ SUPABASE_SECRET_KEY: "k" }),
    /NEXT_PUBLIC_SUPABASE_URL/,
  );
  assert.throws(
    () =>
      resolveKeepaliveConfig({
        NEXT_PUBLIC_SUPABASE_URL: "ftp://example.supabase.co",
        SUPABASE_SECRET_KEY: "k",
      }),
    /http:\/\/ or https:\/\//,
  );
  assert.throws(
    () => resolveKeepaliveConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" }),
    /SUPABASE_SECRET_KEY/,
  );
});

test("formatKeepaliveSource includes workflow run metadata and stays within 120 chars", () => {
  assert.equal(formatKeepaliveSource({}), "local-script");
  assert.equal(
    formatKeepaliveSource({
      GITHUB_ACTIONS: "true",
      GITHUB_WORKFLOW: "Supabase Keepalive",
      GITHUB_RUN_ID: "12345",
    }),
    "github-actions:Supabase Keepalive#12345",
  );
  const longName = "x".repeat(200);
  assert.equal(
    formatKeepaliveSource({ GITHUB_ACTIONS: "true", GITHUB_WORKFLOW: longName }).length,
    120,
  );
});

test("runKeepalive starts at ping_count 1 and increments existing count", async () => {
  const first = createMockSupabase({ readResult: { data: null, error: null } });
  const now = "2026-11-19T02:17:00.000Z";
  const created = await runKeepalive(first.client, {
    now,
    env: { GITHUB_ACTIONS: "true", GITHUB_WORKFLOW: "Supabase Keepalive", GITHUB_RUN_ID: "42" },
  });

  assert.deepEqual(first.recorded.upsertArgs, {
    payload: {
      id: "github-actions",
      source: "github-actions:Supabase Keepalive#42",
      ping_count: 1,
      last_ping_at: now,
    },
    options: { onConflict: "id" },
  });
  assert.equal(created.ping_count, 1);

  const next = createMockSupabase({ readResult: { data: { ping_count: 7 }, error: null } });
  const updated = await runKeepalive(next.client, { now, env: {} });
  assert.equal(updated.ping_count, 8);
  assert.equal(updated.source, "local-script");
});

test("runKeepalive explains missing table migrations and propagates write failures", async () => {
  const missingTable = createMockSupabase({
    readResult: { data: null, error: { code: "PGRST205", message: "Could not find the table" } },
  });
  await assert.rejects(
    () => runKeepalive(missingTable.client, { env: {} }),
    /202611190001_supabase_keepalive\.sql/,
  );

  const writeFailure = createMockSupabase({
    readResult: { data: { ping_count: 2 }, error: null },
    writeResult: { data: null, error: { code: "42501", message: "permission denied" } },
  });
  await assert.rejects(
    () => runKeepalive(writeFailure.client, { env: {} }),
    /keepalive write failed \(42501\): permission denied/,
  );
});
