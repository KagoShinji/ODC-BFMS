import { requirePageAccess } from "@/lib/auth/workspace-access";
import { AdvancesView } from "@/features/advances/advances-view";
export default async function AdvancesPage() {
  await requirePageAccess("advances");
  return <AdvancesView />;
}
