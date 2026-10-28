// Access levels and barangay roles. Keep this module free of runtime imports so
// node tests can load it directly.

export const accessLevels = ["superadmin", "admin", "staff"] as const;
export type AccessLevel = (typeof accessLevels)[number];

export const staffRoles = [
  "encoder",
  "procurement",
  "budget",
  "approver",
  "treasurer",
  "collector",
  "auditor",
] as const;
export const memberRoles = ["admin", ...staffRoles] as const;
export type StaffRole = (typeof staffRoles)[number];
export type MemberRole = (typeof memberRoles)[number];

export const accessLabel: Record<AccessLevel, string> = {
  superadmin: "Super admin",
  admin: "Administrator",
  staff: "Staff",
};

export const roleLabel: Record<MemberRole, string> = {
  admin: "Administrator",
  encoder: "Encoder",
  procurement: "Procurement officer",
  budget: "Budget officer",
  approver: "Approver",
  treasurer: "Treasurer",
  collector: "Collector",
  auditor: "Auditor",
};

export function isAccessLevel(value: unknown): value is AccessLevel {
  return typeof value === "string" && (accessLevels as readonly string[]).includes(value);
}

export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === "string" && (memberRoles as readonly string[]).includes(value);
}

/** White labeling is reserved for super admins. */
export function canManageBranding(level: AccessLevel) {
  return level === "superadmin";
}

/**
 * Live records are read-only until posting passes verification; super admins can
 * already record transactions for support, testing and fixes.
 */
export function canRecordLive(level: AccessLevel) {
  return level === "superadmin";
}

export function canManageStaff(level: AccessLevel) {
  return level === "superadmin" || level === "admin";
}

/** Barangay admins manage staff roles; only super admins grant or revoke the admin role. */
export function assignableRoles(level: AccessLevel): readonly MemberRole[] {
  if (level === "superadmin") return memberRoles;
  if (level === "admin") return staffRoles;
  return [];
}

export function canManageRole(level: AccessLevel, role: string) {
  return (assignableRoles(level) as readonly string[]).includes(role);
}

export const MIN_STAFF_PASSWORD = 12;

export function validateNewStaff(
  input: { fullName?: unknown; email?: unknown; role?: unknown; password?: unknown },
  level: AccessLevel,
  { requirePassword }: { requirePassword: boolean },
): string | null {
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (!fullName || fullName.length > 120) return "Enter the staff member's full name.";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Enter a valid email address.";
  if (!isMemberRole(input.role)) return "Choose a role.";
  if (!canManageRole(level, input.role))
    return input.role === "admin"
      ? "Only a super admin can add administrators."
      : "You are not allowed to assign this role.";
  if (requirePassword) {
    const password = typeof input.password === "string" ? input.password : "";
    if (password.length < MIN_STAFF_PASSWORD || password.length > 72)
      return `Set a temporary password of ${MIN_STAFF_PASSWORD} to 72 characters.`;
  }
  return null;
}

export interface StaffMember {
  userId: string;
  fullName: string;
  email: string;
  role: MemberRole;
  active: boolean;
  createdAt?: string;
}

export interface NewStaff {
  fullName: string;
  email: string;
  role: MemberRole;
  password?: string;
}
