import { requirePageAccess } from "@/lib/auth/workspace-access";
import { DepositsView } from "@/features/deposits/deposits-view";
export default async function DepositsPage() {
  await requirePageAccess("deposits");
  return <DepositsView />;
}
