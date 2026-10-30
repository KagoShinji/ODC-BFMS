import { requirePageAccess } from "@/lib/auth/workspace-access";
import { BudgetView } from "@/features/budget/budget-view";
export default async function BudgetPage() {
  await requirePageAccess("budget");
  return <BudgetView />;
}
