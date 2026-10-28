import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth/session";
import { canManageBranding } from "@/lib/auth/roles";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/** White labeling is super-admin only. Scope is "system" or a barangay id (live mode). */
export async function authorizeBranding(scope: unknown) {
  const account = await currentAccount();
  if (!account) return { response: fail("Sign in again to continue.", 401) };
  if (!canManageBranding(account.level))
    return { response: fail("Only a super admin can change white-label settings.", 403) };
  const value = scope ?? "system";
  if (
    value !== "system" &&
    (account.mode === "demo" || typeof value !== "string" || !uuid.test(value))
  )
    return { response: fail("Choose the system or a barangay to brand.", 400) };
  return { account, scope: value as string };
}
