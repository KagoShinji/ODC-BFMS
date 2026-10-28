import { FinanceProvider } from "@/data/demo/finance-provider";
import { emptyFinanceData, loadFinanceData } from "@/data/supabase/workspace-data";
import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "next/navigation";
import { LiveModeView } from "@/features/live/live-mode-view";
import { getWorkspaceBarangays } from "@/lib/auth/active-barangay";
import { canRecordLive } from "@/lib/auth/roles";
import { getWorkspaceSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getWorkspaceSession();
  if (session.status === "signed-out") redirect("/login");
  if (session.status !== "ready")
    return <LiveModeView state={session.status} email={session.email} />;
  const { account } = session;
  if (account.mode === "demo")
    return (
      <FinanceProvider>
        <AppShell account={account}>{children}</AppShell>
      </FinanceProvider>
    );

  // Live mode shows the selected barangay's records; only super admins record changes.
  const { options, active, lockedBySubdomain } = await getWorkspaceBarangays(account);
  const live = active
    ? await loadFinanceData(await createClient(), active)
    : { data: emptyFinanceData("No barangay yet"), error: undefined };
  return (
    <FinanceProvider
      key={active?.id ?? "none"}
      preview
      initialData={live.data}
      liveRecording={Boolean(active) && canRecordLive(account.level)}
    >
      <AppShell
        preview
        account={account}
        workspace={{
          barangays: options,
          activeId: active?.id ?? null,
          locked: lockedBySubdomain,
          loadError: live.error,
        }}
      >
        {children}
      </AppShell>
    </FinanceProvider>
  );
}
