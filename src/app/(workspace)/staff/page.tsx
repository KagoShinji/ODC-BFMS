import { loadStaffDirectory } from "@/data/supabase/staff-repository";
import { DemoStaffView, LiveStaffView } from "@/features/staff/staff-view";
import { requirePageAccess } from "@/lib/auth/workspace-access";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ barangay?: string }>;
}) {
  const { account } = await requirePageAccess("staff");
  if (account.mode === "demo") return <DemoStaffView level={account.level} />;
  const { barangay } = await searchParams;
  return (
    <LiveStaffView level={account.level} directory={await loadStaffDirectory(account, barangay)} />
  );
}
