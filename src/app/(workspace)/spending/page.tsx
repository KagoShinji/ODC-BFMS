import { requirePageAccess } from "@/lib/auth/workspace-access";
import { ExpenseCasesView } from "@/features/spending/expense-cases-view";
export default async function SpendingPage() {
  await requirePageAccess("spending");
  return <ExpenseCasesView />;
}
