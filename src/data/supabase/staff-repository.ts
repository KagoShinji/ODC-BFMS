import type { WorkspaceAccount } from "@/lib/auth/session";
import { isMemberRole, type StaffMember } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { validPageSelection } from "@/lib/auth/page-access";

export interface StaffDirectory {
  barangays: { id: string; name: string; slug: string }[];
  barangayId: string | null;
  members: StaffMember[];
  canCreateAccounts: boolean;
  error?: string;
}

const schemaError =
  "Staff access settings are not ready. Apply the account page access migration, then reload.";

/** Barangays the account may manage and the selected barangay's memberships, read under RLS. */
export async function loadStaffDirectory(
  account: WorkspaceAccount,
  requestedBarangayId?: string,
): Promise<StaffDirectory> {
  const canCreateAccounts = Boolean(process.env.SUPABASE_SECRET_KEY);
  const empty = { barangays: [], barangayId: null, members: [], canCreateAccounts };
  if (account.level === "staff") return empty;
  const supabase = await createClient();
  let barangayQuery = supabase.from("barangays").select("id, name, slug").order("name");
  if (account.level === "admin") barangayQuery = barangayQuery.in("id", account.adminBarangayIds);
  const { data: barangays, error } = await barangayQuery;
  if (error) return { ...empty, error: schemaError };
  const barangayId =
    barangays.find((item) => item.id === requestedBarangayId)?.id ?? barangays[0]?.id ?? null;
  if (!barangayId) return { ...empty, barangays };

  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("user_id, role, active, created_at")
    .eq("barangay_id", barangayId);
  if (membershipError) return { ...empty, barangays, barangayId, error: schemaError };
  const { data: pageAccess, error: pageError } = await supabase.rpc("get_staff_page_access", {
    p_barangay_id: barangayId,
  });
  if (pageError) return { ...empty, barangays, barangayId, error: schemaError };
  const accessByUser = new Map<
    string,
    { pages: StaffMember["pageOverride"]; version: number; isSystemAdmin: boolean }
  >();
  for (const item of pageAccess ?? []) {
    if (item.pages !== null && !validPageSelection(item.pages))
      return { ...empty, barangays, barangayId, error: schemaError };
    accessByUser.set(item.user_id, {
      pages: item.pages,
      version: item.version,
      isSystemAdmin: item.is_system_admin,
    });
  }
  const userIds = [...new Set(memberships.map((item) => item.user_id as string))];
  const profiles = new Map<string, { full_name: string; email: string }>();
  if (userIds.length) {
    const { data, error: profileError } = await supabase
      .from("staff_profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);
    if (profileError) return { ...empty, barangays, barangayId, error: schemaError };
    data.forEach((item) => profiles.set(item.user_id, item));
  }

  const members: StaffMember[] = memberships
    .filter((item) => isMemberRole(item.role))
    .map((item) => {
      const profile = profiles.get(item.user_id);
      const access = accessByUser.get(item.user_id);
      return {
        userId: item.user_id,
        fullName: profile?.full_name ?? "Profile not set",
        email: profile?.email ?? item.user_id,
        role: item.role,
        active: item.active,
        createdAt: item.created_at ?? undefined,
        pageOverride: access?.pages ?? null,
        pageAccessVersion: access?.version ?? 0,
        isSystemAdmin: access?.isSystemAdmin ?? false,
      };
    })
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        Number(b.role === "admin") - Number(a.role === "admin") ||
        a.fullName.localeCompare(b.fullName),
    );
  return { barangays, barangayId, members, canCreateAccounts };
}
