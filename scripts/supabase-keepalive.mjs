import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_KEEPALIVE_ID = "github-actions";
const MAX_SOURCE_LENGTH = 120;
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

/**
 * Resolve Supabase URL and secret key from environment variables.
 * Throws a clear error if either value is missing or malformed.
 */
export function resolveKeepaliveConfig(env = process.env) {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").trim();
  const secretKey = (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL). Configure it in GitHub repository secrets.",
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL.");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use http:// or https://.");
  }

  if (!secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). Configure it in GitHub repository secrets.",
    );
  }

  return { url: parsedUrl.origin, secretKey };
}

/**
 * Format a bounded source label describing where the keepalive ping originated.
 */
export function formatKeepaliveSource(env = process.env) {
  const raw = env.GITHUB_ACTIONS
    ? `github-actions:${env.GITHUB_WORKFLOW || "keepalive"}#${env.GITHUB_RUN_ID || "manual"}`
    : "local-script";
  return raw.slice(0, MAX_SOURCE_LENGTH);
}

function formatSupabaseError(operation, error) {
  const code = error?.code ?? "unknown";
  if (MISSING_TABLE_CODES.has(code)) {
    return new Error(
      `Supabase keepalive ${operation} failed (${code}): public.supabase_keepalive table is missing. Apply supabase/migrations/202611190001_supabase_keepalive.sql first.`,
    );
  }
  return new Error(
    `Supabase keepalive ${operation} failed (${code}): ${error?.message ?? "unknown error"}`,
  );
}

/**
 * Read the current keepalive row and upsert a fresh timestamp and incremented counter.
 */
export async function runKeepalive(supabase, options = {}) {
  const id = options.id ?? DEFAULT_KEEPALIVE_ID;
  const source = (options.source ?? formatKeepaliveSource(options.env)).slice(0, MAX_SOURCE_LENGTH);
  const now = options.now ?? new Date().toISOString();

  const { data: existing, error: readError } = await supabase
    .from("supabase_keepalive")
    .select("ping_count")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    throw formatSupabaseError("read", readError);
  }

  const nextPingCount = Number(existing?.ping_count ?? 0) + 1;

  const { data: written, error: writeError } = await supabase
    .from("supabase_keepalive")
    .upsert(
      {
        id,
        source,
        ping_count: nextPingCount,
        last_ping_at: now,
      },
      { onConflict: "id" },
    )
    .select("id, source, ping_count, last_ping_at")
    .single();

  if (writeError) {
    throw formatSupabaseError("write", writeError);
  }

  return written;
}

async function main() {
  const { url, secretKey } = resolveKeepaliveConfig(process.env);
  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const record = await runKeepalive(supabase, { env: process.env });
  process.stdout.write(
    `Supabase keepalive recorded: id=${record.id}, ping_count=${record.ping_count}, last_ping_at=${record.last_ping_at}\n`,
  );
}

const isDirectExecution =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;

if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
