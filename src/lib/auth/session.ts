import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE_NAME, verifyDemoSession } from "./demo-session";
import { dataProvider } from "./provider";
import { isMemberRole, type AccessLevel, type MemberRole } from "./roles";
import { validPageSelection, type ConfigurablePage } from "./page-access";

export interface WorkspaceAccount {
  mode: "demo" | "supabase";
  level: AccessLevel;
  email?: string;
  userId?: string;
  /** Live barangays where this account holds the admin role. */
  adminBarangayIds: string[];
  /** The live barangay whose branding and sign-in link this account uses. */
  barangayId?: string;
  /** Every live barangay this account holds an active role in. */
  barangayIds: string[];
  memberships?: { barangayId: string; role: MemberRole }[];
  pageOverrides?: Record<string, { pages: ConfigurablePage[] | null; version: number }>;
}

export type WorkspaceSession =
  | { status: "ready"; account: WorkspaceAccount }
  | { status: "signed-out" }
  | { status: "missing-config" | "migration-pending" | "membership-pending"; email?: string };

/**
 * Resolves the signed-in account and its access level: super admins come from
 * `system_admins`, admins hold the barangay `admin` role, everyone else is staff.
 */
export const getWorkspaceSession = cache(async (): Promise<WorkspaceSession> => {
  if (dataProvider() === "demo") {
    const cookieStore = await cookies();
    const session = verifyDemoSession(cookieStore.get(DEMO_COOKIE_NAME)?.value);
    if (!session) return { status: "signed-out" };
    return {
      status: "ready",
      account: { mode: "demo", level: session.level, adminBarangayIds: [], barangayIds: [] },
    };
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return { status: "missing-config" };
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { status: "signed-out" };
  const user = authData.user;
  const [membershipResult, systemAdminResult] = await Promise.all([
    supabase
      .from("memberships")
      .select("barangay_id, role")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("barangay_id"),
    supabase.from("system_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (membershipResult.error || systemAdminResult.error)
    return { status: "migration-pending", email: user.email };
  const memberships = membershipResult.data ?? [];
  const isSystemAdmin = Boolean(systemAdminResult.data);
  if (!isSystemAdmin && !memberships.length)
    return { status: "membership-pending", email: user.email };
  const adminBarangayIds = memberships
    .filter((membership) => membership.role === "admin")
    .map((membership) => membership.barangay_id as string);
  const pageOverrides: NonNullable<WorkspaceAccount["pageOverrides"]> = {};
  if (!isSystemAdmin) {
    const { data, error } = await supabase
      .from("account_page_access")
      .select("barangay_id, pages, version")
      .eq("user_id", user.id);
    if (error) return { status: "migration-pending", email: user.email };
    for (const item of data ?? []) {
      if (item.pages !== null && !validPageSelection(item.pages))
        return { status: "migration-pending", email: user.email };
      pageOverrides[item.barangay_id] = { pages: item.pages, version: item.version };
    }
  }
  return {
    status: "ready",
    account: {
      mode: "supabase",
      level: isSystemAdmin ? "superadmin" : adminBarangayIds.length ? "admin" : "staff",
      email: user.email,
      userId: user.id,
      adminBarangayIds,
      barangayId: adminBarangayIds[0] ?? memberships[0]?.barangay_id,
      barangayIds: [...new Set(memberships.map((item) => item.barangay_id as string))],
      memberships: memberships
        .filter((item) => isMemberRole(item.role))
        .map((item) => ({ barangayId: item.barangay_id, role: item.role as MemberRole })),
      pageOverrides,
    },
  };
});

export async function currentAccount() {
  const session = await getWorkspaceSession();
  return session.status === "ready" ? session.account : null;
}
