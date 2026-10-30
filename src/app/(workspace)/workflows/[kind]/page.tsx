import { requirePageAccess } from "@/lib/auth/workspace-access";
import { notFound } from "next/navigation";
import { ExpenseCasesView } from "@/features/spending/expense-cases-view";
import { expenseKinds, type ExpenseKind } from "@/domain/types";

export default async function WorkflowPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!expenseKinds.includes(kind as ExpenseKind)) notFound();
  await requirePageAccess(kind as ExpenseKind);
  return <ExpenseCasesView kind={kind as ExpenseKind} />;
}
