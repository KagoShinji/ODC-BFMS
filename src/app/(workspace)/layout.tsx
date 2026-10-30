import { FinanceProvider } from "@/data/demo/finance-provider";
import { emptyFinanceData, loadFinanceData } from "@/data/supabase/workspace-data";
import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "next/navigation";
import { LiveModeView } from "@/features/live/live-mode-view";
import { accessForAccount } from "@/lib/auth/workspace-access";
import { PageAccessProvider } from "@/components/layout/page-access-provider";
import {
  canApproveVoucherForBarangay,
  canRecordLive,
  canRecordPaymentForBarangay,
} from "@/lib/auth/roles";
import { getWorkspaceSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getWorkspaceSession();
  if (session.status === "signed-out") redirect("/login");
  if (session.status !== "ready")
    return <LiveModeView state={session.status} email={session.email} />;
  const { account } = session;
  const { options, active, lockedBySubdomain, pages } = await accessForAccount(account);
  if (account.mode === "demo")
    return (
      <PageAccessProvider pages={pages}>
        <FinanceProvider>
          <AppShell account={account}>{children}</AppShell>
        </FinanceProvider>
      </PageAccessProvider>
    );

  // Live mode shows the selected barangay's records; approvers may approve/reject vouchers.
  const live = active
    ? await loadFinanceData(await createClient(), active)
    : { data: emptyFinanceData("No barangay yet"), error: undefined };
  return (
    <PageAccessProvider pages={pages}>
      <FinanceProvider
        key={active?.id ?? "none"}
        preview
        initialData={live.data}
        liveRecording={Boolean(active) && canRecordLive(account.level)}
        liveApproval={canApproveVoucherForBarangay(account, active?.id ?? null)}
        livePayment={canRecordPaymentForBarangay(account, active?.id ?? null)}
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
    </PageAccessProvider>
  );
}
