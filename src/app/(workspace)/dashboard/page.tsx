import { requirePageAccess } from "@/lib/auth/workspace-access";
import { DashboardView } from "@/features/dashboard/dashboard-view";
export default async function DashboardPage() {
  await requirePageAccess("dashboard");
  return <DashboardView />;
}
