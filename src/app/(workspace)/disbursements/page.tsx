import { requirePageAccess } from "@/lib/auth/workspace-access";
import { DisbursementsView } from "@/features/disbursements/disbursements-view";
export default async function DisbursementsPage() {
  await requirePageAccess("disbursements");
  return <DisbursementsView />;
}
