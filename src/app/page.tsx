import { redirect } from "next/navigation";
import { getWorkspaceSession } from "@/lib/auth/session";
import { accessForAccount } from "@/lib/auth/workspace-access";
import { landingPage } from "@/lib/auth/page-access";

export default async function Home() {
  const session = await getWorkspaceSession();
  if (session.status === "signed-out") redirect("/login");
  // Setup states are rendered by the workspace layout.
  if (session.status !== "ready") redirect("/settings");
  redirect(landingPage((await accessForAccount(session.account)).pages));
}
