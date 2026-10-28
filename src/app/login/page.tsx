import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BrandingProvider } from "@/components/layout/brand";
import { LoginView } from "@/features/auth/login-view";
import { DEMO_COOKIE_NAME, demoLoginHint, verifyDemoSession } from "@/lib/auth/demo-session";
import { dataProvider } from "@/lib/auth/provider";
import { brandPalette, brandTitle } from "@/lib/branding";
import { getPortal } from "@/lib/branding-server";
import { subdomainSlug } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ b?: string }> };

/** A barangay sign-in link (/b/<slug>) or barangay subdomain picks the branding. */
async function portalFor(searchParams: Props["searchParams"]) {
  return getPortal((await searchParams).b ?? (await subdomainSlug()) ?? undefined);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const portal = await portalFor(searchParams);
  if (!portal) return {};
  return {
    title: brandTitle(portal.branding),
    icons: portal.branding.logoUrl ? { icon: portal.branding.logoUrl } : undefined,
  };
}

export default async function LoginPage({ searchParams }: Props) {
  const mode = dataProvider();
  if (mode === "demo") {
    const cookieStore = await cookies();
    if (verifyDemoSession(cookieStore.get(DEMO_COOKIE_NAME)?.value)) redirect("/dashboard");
  } else if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard");
  }
  const props = {
    mode,
    demoHint: mode === "demo" ? demoLoginHint() : null,
    supabaseConfigured: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ),
  };
  const portal = await portalFor(searchParams);
  if (!portal) return <LoginView {...props} />;
  return (
    <BrandingProvider value={portal.branding}>
      <div style={brandPalette(portal.branding.accentColor) as CSSProperties}>
        <LoginView {...props} barangayName={portal.barangayName} />
      </div>
    </BrandingProvider>
  );
}
