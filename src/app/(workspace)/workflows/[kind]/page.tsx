import { notFound } from "next/navigation";
import { ExpenseCasesView } from "@/features/spending/expense-cases-view";
import { expenseKinds, type ExpenseKind } from "@/domain/types";

export default async function WorkflowPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!expenseKinds.includes(kind as ExpenseKind)) notFound();
  return <ExpenseCasesView kind={kind as ExpenseKind} />;
}
