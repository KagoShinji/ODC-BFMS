import { requirePageAccess } from "@/lib/auth/workspace-access";
import { SettingsView } from "@/features/settings/settings-view";
export default async function SettingsPage() {
  await requirePageAccess("settings");
  return <SettingsView />;
}
