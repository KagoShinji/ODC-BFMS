import { requirePageAccess } from "@/lib/auth/workspace-access";
import { AuditView } from "@/features/audit/audit-view";
export default async function AuditPage() {
  const { account } = await requirePageAccess("audit");
  // The server serializes the notice, keeping its text consistent at hydration.
  const notice =
    account.mode === "supabase"
      ? "Live events are recorded by the database. This view contains up to the latest 200 events available for your account in the selected barangay."
      : "These are browser-stored demonstration events. Older entries may not have account details.";
  return <AuditView notice={notice} />;
}
