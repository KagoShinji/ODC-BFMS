import { notFound } from "next/navigation";
import { loadStaffDirectory } from "@/data/supabase/staff-repository";
import { DemoStaffView, LiveStaffView } from "@/features/staff/staff-view";
import { canManageStaff } from "@/lib/auth/roles";
import { getWorkspaceSession } from "@/lib/auth/session";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ barangay?: string }>;
}) {
  const session = await getWorkspaceSession();
  if (session.status !== "ready" || !canManageStaff(session.account.level)) notFound();
  const { account } = session;
  if (account.mode === "demo") return <DemoStaffView level={account.level} />;
  const { barangay } = await searchParams;
  return (
    <LiveStaffView level={account.level} directory={await loadStaffDirectory(account, barangay)} />
  );
}
