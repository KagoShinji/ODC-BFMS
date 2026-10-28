import { FinanceProvider } from "@/data/demo/finance-provider";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LiveModeView } from "@/features/live/live-mode-view";
import { cookies } from "next/headers";
import { DEMO_COOKIE_NAME, verifyDemoSession } from "@/lib/auth/demo-session";
import { dataProvider } from "@/lib/auth/provider";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  if (dataProvider() === "supabase") {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
      return <LiveModeView state="missing-config" />;
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) redirect("/login");
    const [membershipResult, systemAdminResult] = await Promise.all([
      supabase
        .from("memberships")
        .select("barangay_id, role, barangays(name)")
        .eq("user_id", authData.user.id)
        .eq("active", true),
      supabase
        .from("system_admins")
        .select("user_id")
        .eq("user_id", authData.user.id)
        .maybeSingle(),
    ]);
    const memberships = membershipResult.data ?? [];
    const isSystemAdmin = Boolean(systemAdminResult.data);
    if (membershipResult.error || systemAdminResult.error)
      return <LiveModeView state="migration-pending" email={authData.user.email} />;
    if (!isSystemAdmin && !memberships.length)
      return <LiveModeView state="membership-pending" email={authData.user.email} />;
    return (
      <FinanceProvider preview>
        <AppShell preview accountEmail={authData.user.email} isSystemAdmin={isSystemAdmin}>
          {children}
        </AppShell>
      </FinanceProvider>
    );
  }
  const cookieStore = await cookies();
  if (!verifyDemoSession(cookieStore.get(DEMO_COOKIE_NAME)?.value)) redirect("/login");
  return (
    <FinanceProvider>
      <AppShell>{children}</AppShell>
    </FinanceProvider>
  );
}
