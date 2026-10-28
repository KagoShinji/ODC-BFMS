import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client for creating Auth accounts. Import it from route handlers
 * only; SUPABASE_SECRET_KEY must never reach the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
