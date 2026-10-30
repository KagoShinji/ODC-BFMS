import { requirePageAccess } from "@/lib/auth/workspace-access";
import { AuditView } from "@/features/audit/audit-view";
export default async function AuditPage() {
  await requirePageAccess("audit");
  return <AuditView />;
}
