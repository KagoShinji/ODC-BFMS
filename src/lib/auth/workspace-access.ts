import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getWorkspaceSession, type WorkspaceAccount } from "./session";
import { getWorkspaceBarangays } from "./active-barangay";
import { pagesForBarangay, type PageKey } from "./page-access";

export const accessForAccount = cache(async (account: WorkspaceAccount) => {
  const workspace = await getWorkspaceBarangays(account);
  const pages = pagesForBarangay(account, workspace.active?.id ?? null);
  return { ...workspace, pages };
});

/** Run on every page request, including direct URLs and client-side navigation. */
export async function requirePageAccess(page: PageKey) {
  const session = await getWorkspaceSession();
  if (session.status === "signed-out") redirect("/login");
  if (session.status !== "ready") notFound();
  const access = await accessForAccount(session.account);
  if (!access.pages.includes(page)) notFound();
  return { account: session.account, ...access };
}
