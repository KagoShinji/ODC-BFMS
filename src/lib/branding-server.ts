import { cache } from "react";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dataProvider } from "@/lib/auth/provider";
import { getWorkspaceBarangays } from "@/lib/auth/active-barangay";
import { getWorkspaceSession } from "@/lib/auth/session";
import { brandingFromStored, defaultBranding, isPortalSlug, type Branding } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";

// Demo white-label settings live in this browser's cookie, like the rest of the demo data.
export const BRANDING_COOKIE_NAME = "odc_branding";
export const BRANDING_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
export const BRAND_BUCKET = "brand-assets";

const columns = "app_name, organization_name, mark_text, logo_url, accent_color";
type BrandingRecord = {
  app_name: string;
  organization_name: string;
  mark_text: string;
  logo_url: string;
  accent_color: string;
};

export function encodeBrandingCookie(branding: Branding) {
  return Buffer.from(JSON.stringify(branding)).toString("base64url");
}

export function brandingRow(branding: Branding): BrandingRecord {
  return {
    app_name: branding.appName,
    organization_name: branding.organizationName,
    mark_text: branding.markText,
    logo_url: branding.logoUrl,
    accent_color: branding.accentColor,
  };
}

function fromRow(row: BrandingRecord) {
  return brandingFromStored({
    appName: row.app_name,
    organizationName: row.organization_name,
    markText: row.mark_text,
    logoUrl: row.logo_url,
    accentColor: row.accent_color,
  });
}

function liveConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/** The platform default, used by super admins and barangays without their own branding. */
export const getSystemBranding = cache(async (): Promise<Branding> => {
  if (dataProvider() === "demo") {
    const raw = (await cookies()).get(BRANDING_COOKIE_NAME)?.value;
    if (!raw) return defaultBranding;
    try {
      return brandingFromStored(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
    } catch {
      return defaultBranding;
    }
  }
  if (!liveConfigured()) return defaultBranding;
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_branding").select(columns).maybeSingle();
  return error || !data ? defaultBranding : fromRow(data);
});

export async function getBarangayBranding(supabase: SupabaseClient, barangayId: string) {
  const { data, error } = await supabase
    .from("barangay_branding")
    .select(columns)
    .eq("barangay_id", barangayId)
    .maybeSingle();
  return error || !data ? null : fromRow(data);
}

/**
 * Branding for the barangay being viewed (a super admin sees the barangay they
 * switched to), falling back to the system branding.
 */
export const getBranding = cache(async (): Promise<Branding> => {
  if (dataProvider() === "demo") return getSystemBranding();
  const session = await getWorkspaceSession();
  if (session.status === "ready") {
    const { active } = await getWorkspaceBarangays(session.account);
    const branding = active && (await getBarangayBranding(await createClient(), active.id));
    if (branding) return branding;
  }
  return getSystemBranding();
});

/** Public branding for a barangay sign-in link (/b/<slug>), readable before sign-in. */
export const getPortal = cache(async (slug: string | undefined) => {
  if (dataProvider() === "demo" || !liveConfigured() || !isPortalSlug(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("barangay_branding_for_slug", { p_slug: slug });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return null;
  return {
    slug,
    barangayName: row.barangay_name as string,
    branding: row.app_name ? fromRow(row) : await getSystemBranding(),
  };
});

export async function loadBrandingScopes(supabase: SupabaseClient) {
  const [barangays, rows] = await Promise.all([
    supabase.from("barangays").select("id, name, slug").order("name"),
    supabase.from("barangay_branding").select(`barangay_id, ${columns}`),
  ]);
  if (barangays.error || rows.error) return null;
  const custom = new Map(rows.data.map((row) => [row.barangay_id as string, fromRow(row)]));
  return barangays.data.map((item) => ({
    id: item.id as string,
    name: item.name as string,
    slug: item.slug as string,
    branding: custom.get(item.id) ?? null,
  }));
}

export function brandAssetPath(url: string) {
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BRAND_BUCKET}/`;
  return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null;
}

/** "system" or a barangay id. */
export type BrandingScope = string;

async function currentLogo(supabase: SupabaseClient, scope: BrandingScope) {
  const { data } =
    scope === "system"
      ? await supabase.from("app_branding").select("logo_url").maybeSingle()
      : await supabase
          .from("barangay_branding")
          .select("logo_url")
          .eq("barangay_id", scope)
          .maybeSingle();
  return (data?.logo_url as string | undefined) ?? "";
}

async function removeUploadedLogo(supabase: SupabaseClient, url: string) {
  const path = brandAssetPath(url);
  if (path) await supabase.storage.from(BRAND_BUCKET).remove([path]);
}

/** Saves live branding under row level security and deletes a replaced uploaded logo. */
export async function saveBranding(
  supabase: SupabaseClient,
  scope: BrandingScope,
  branding: Branding,
) {
  const previous = await currentLogo(supabase, scope);
  const row = brandingRow(branding);
  let saved = false;
  if (scope === "system") {
    const { data } = await supabase.from("app_branding").update(row).eq("id", true).select("id");
    saved = Boolean(data?.length);
  } else {
    const { data } = await supabase
      .from("barangay_branding")
      .update(row)
      .eq("barangay_id", scope)
      .select("barangay_id");
    saved = Boolean(data?.length);
    if (!saved) {
      const { error } = await supabase
        .from("barangay_branding")
        .insert({ barangay_id: scope, ...row });
      saved = !error;
    }
  }
  if (!saved) return false;
  if (previous !== branding.logoUrl) await removeUploadedLogo(supabase, previous);
  return true;
}

export async function clearBarangayBranding(supabase: SupabaseClient, barangayId: string) {
  const previous = await currentLogo(supabase, barangayId);
  const { error } = await supabase.from("barangay_branding").delete().eq("barangay_id", barangayId);
  if (error) return false;
  await removeUploadedLogo(supabase, previous);
  return true;
}
