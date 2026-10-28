import { cache } from "react";
import { cookies } from "next/headers";
import { subdomainSlug } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceAccount } from "./session";

export const ACTIVE_BARANGAY_COOKIE = "odc_barangay";

export interface BarangayOption {
  id: string;
  name: string;
  slug: string;
}

async function accessibleBarangays(account: WorkspaceAccount): Promise<BarangayOption[]> {
  if (account.level !== "superadmin" && !account.barangayIds.length) return [];
  const supabase = await createClient();
  const query = (columns: string) => {
    const base = supabase.from("barangays").select(columns).order("name");
    return account.level === "superadmin" ? base : base.in("id", account.barangayIds);
  };
  const { data, error } = await query("id, name, slug");
  if (!error) return data as unknown as BarangayOption[];
  // Before the barangay branding migration there is no slug column.
  const fallback = await query("id, name");
  return fallback.error
    ? []
    : (fallback.data as unknown as { id: string; name: string }[]).map((item) => ({
        ...item,
        slug: "",
      }));
}

/**
 * The barangays a live account can open and the one it is viewing. A barangay
 * subdomain wins, then the switcher's saved choice, then the account's home barangay.
 */
export const getWorkspaceBarangays = cache(async (account: WorkspaceAccount) => {
  const options = account.mode === "supabase" ? await accessibleBarangays(account) : [];
  const fromSubdomain = await subdomainSlug();
  const subdomainBarangay = fromSubdomain
    ? options.find((item) => item.slug === fromSubdomain)
    : undefined;
  const saved = (await cookies()).get(ACTIVE_BARANGAY_COOKIE)?.value;
  const active =
    subdomainBarangay ??
    options.find((item) => item.id === saved) ??
    options.find((item) => item.id === account.barangayId) ??
    options[0] ??
    null;
  return { options, active, lockedBySubdomain: Boolean(subdomainBarangay) };
});
