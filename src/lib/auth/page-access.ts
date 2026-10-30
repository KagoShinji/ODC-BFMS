import type { AccessLevel, MemberRole } from "./roles";
import type { WorkspaceAccount } from "./session";

/** Stable keys persisted in account_page_access; keep the migration in sync. */
export const configurablePages = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", group: "Workspace" },
  { key: "budget", label: "Budget", href: "/budget", group: "Workspace" },
  { key: "spending", label: "All expense cases", href: "/spending", group: "Spending" },
  { key: "procurement", label: "Procurement", href: "/workflows/procurement", group: "Spending" },
  { key: "payroll", label: "Payroll", href: "/workflows/payroll", group: "Spending" },
  { key: "recurring", label: "Recurring fees", href: "/workflows/recurring", group: "Spending" },
  { key: "travel", label: "Travel", href: "/workflows/travel", group: "Spending" },
  { key: "transfer", label: "SK transfers", href: "/workflows/transfer", group: "Spending" },
  { key: "disbursements", label: "Disbursements", href: "/disbursements", group: "Spending" },
  { key: "advances", label: "Cash advances", href: "/advances", group: "Spending" },
  { key: "collections", label: "Collections", href: "/collections", group: "Revenue" },
  { key: "deposits", label: "Deposits & remittances", href: "/deposits", group: "Revenue" },
  { key: "reports", label: "Reports", href: "/reports", group: "Management" },
  { key: "audit", label: "Audit trail", href: "/audit", group: "Management" },
] as const;

export type ConfigurablePage = (typeof configurablePages)[number]["key"];
export type PageKey = ConfigurablePage | "settings" | "staff" | "branding";

const expensePages: ConfigurablePage[] = [
  "spending",
  "procurement",
  "payroll",
  "recurring",
  "travel",
  "transfer",
];
const financePages: ConfigurablePage[] = [
  "dashboard",
  "budget",
  ...expensePages,
  "disbursements",
  "advances",
  "collections",
  "deposits",
  "reports",
];

export const rolePageDefaults: Record<MemberRole, readonly ConfigurablePage[]> = {
  admin: configurablePages.map((page) => page.key),
  encoder: ["dashboard", "budget", ...expensePages, "disbursements", "advances", "reports"],
  procurement: ["dashboard", "budget", "procurement", "reports"],
  budget: ["dashboard", "budget", "spending", "disbursements", "advances", "reports"],
  approver: ["dashboard", "budget", "spending", "disbursements", "advances", "reports"],
  treasurer: financePages,
  collector: ["dashboard", "collections", "deposits", "reports"],
  auditor: configurablePages.map((page) => page.key),
};

export function validPageSelection(value: unknown): value is ConfigurablePage[] {
  return (
    Array.isArray(value) &&
    value.length <= configurablePages.length &&
    value.every((key) => configurablePages.some((page) => page.key === key)) &&
    new Set(value).size === value.length
  );
}

export function defaultPagesForRoles(roles: readonly MemberRole[]): ConfigurablePage[] {
  return configurablePages
    .filter((page) => roles.some((role) => rolePageDefaults[role].includes(page.key)))
    .map((page) => page.key);
}

/** null uses the union of active roles; [] deliberately grants no financial pages. */
export function effectivePages(
  level: AccessLevel,
  roles: readonly MemberRole[],
  override: readonly ConfigurablePage[] | null = null,
): PageKey[] {
  if (level === "superadmin")
    return [...configurablePages.map((page) => page.key), "settings", "staff", "branding"];
  const result: PageKey[] = [...(override ?? defaultPagesForRoles(roles)), "settings"];
  if (roles.includes("admin")) result.push("staff");
  return result;
}

export function pageForPath(path: string): PageKey | null {
  const clean = path.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  const page = configurablePages.find((item) => item.href === clean);
  if (page) return page.key;
  if (clean === "/settings") return "settings";
  if (clean === "/staff") return "staff";
  if (clean === "/branding") return "branding";
  return null;
}

export function canAccessPath(pages: readonly PageKey[], path: string): boolean {
  const page = pageForPath(path);
  return page !== null && pages.includes(page);
}

export function landingPage(pages: readonly PageKey[]): string {
  return configurablePages.find((page) => pages.includes(page.key))?.href ?? "/settings";
}

/** The selected barangay owns the role union and override; neither leaks to another scope. */
export function pagesForBarangay(account: WorkspaceAccount, barangayId: string | null): PageKey[] {
  const roles =
    account.mode === "demo"
      ? [account.level === "admin" ? ("admin" as const) : ("encoder" as const)]
      : (account.memberships ?? [])
          .filter((item) => item.barangayId === barangayId)
          .map((item) => item.role);
  const override = barangayId ? (account.pageOverrides?.[barangayId]?.pages ?? null) : null;
  const pages = effectivePages(account.level, roles, override);
  // Staff management's own selector is limited to administered barangays.
  if (account.adminBarangayIds.length && !pages.includes("staff")) pages.push("staff");
  return pages;
}
