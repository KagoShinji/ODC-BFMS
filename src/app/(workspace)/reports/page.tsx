import { requirePageAccess } from "@/lib/auth/workspace-access";
import { ReportsView } from "@/features/reports/reports-view";
export default async function ReportsPage() {
  await requirePageAccess("reports");
  return <ReportsView />;
}
