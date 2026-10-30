import { BrandingView } from "@/features/branding/branding-view";
import { requirePageAccess } from "@/lib/auth/workspace-access";
import { getSystemBranding, loadBrandingScopes } from "@/lib/branding-server";
import { createClient } from "@/lib/supabase/server";

export default async function BrandingPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { account } = await requirePageAccess("branding");
  const system = await getSystemBranding();
  if (account.mode === "demo")
    return <BrandingView mode="demo" system={system} barangays={[]} scope="system" />;
  const barangays = await loadBrandingScopes(await createClient());
  const { scope } = await searchParams;
  return (
    <BrandingView
      mode="supabase"
      system={system}
      barangays={barangays ?? []}
      scope={barangays?.some((item) => item.id === scope) ? scope! : "system"}
      error={barangays ? undefined : "Barangay branding is not set up. Apply the latest migration."}
    />
  );
}
