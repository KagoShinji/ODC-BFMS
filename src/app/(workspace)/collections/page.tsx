import { requirePageAccess } from "@/lib/auth/workspace-access";
import { CollectionsView } from "@/features/collections/collections-view";
export default async function CollectionsPage() {
  await requirePageAccess("collections");
  return <CollectionsView />;
}
