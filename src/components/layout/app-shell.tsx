"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileBarChart2,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Plane,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  Settings2,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinance } from "@/data/demo/finance-provider";
import type { BarangayOption } from "@/lib/auth/active-barangay";
import type { WorkspaceAccount } from "@/lib/auth/session";
import { accessLabel, canManageBranding, canManageStaff, type AccessLevel } from "@/lib/auth/roles";
import { BrandLockup } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavLink = {
  href: string;
  label: string;
  icon: typeof Wallet;
  allow?: (level: AccessLevel) => boolean;
};

const allGroups: { label: string; links: NavLink[] }[] = [
  {
    label: "Workspace",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/budget", label: "Budget", icon: Wallet },
    ],
  },
  {
    label: "Spending",
    links: [
      { href: "/spending", label: "Expense cases", icon: Boxes },
      { href: "/workflows/procurement", label: "Procurement", icon: ClipboardCheck },
      { href: "/workflows/payroll", label: "Payroll", icon: Users },
      { href: "/workflows/recurring", label: "Recurring fees", icon: RefreshCcw },
      { href: "/workflows/travel", label: "Travel", icon: Plane },
      { href: "/workflows/transfer", label: "SK transfers", icon: ArrowUpRight },
      { href: "/disbursements", label: "Disbursements", icon: FileText },
      { href: "/advances", label: "Cash advances", icon: BookOpen },
    ],
  },
  {
    label: "Revenue",
    links: [
      { href: "/collections", label: "Collections", icon: ReceiptText },
      { href: "/deposits", label: "Deposits & remittances", icon: Landmark },
    ],
  },
  {
    label: "Management",
    links: [
      { href: "/reports", label: "Reports", icon: FileBarChart2 },
      { href: "/audit", label: "Audit trail", icon: ShieldCheck },
      { href: "/staff", label: "Staff & access", icon: UserCog, allow: canManageStaff },
      { href: "/settings", label: "Settings", icon: Settings2 },
    ],
  },
  {
    label: "System",
    links: [{ href: "/branding", label: "White label", icon: Palette, allow: canManageBranding }],
  },
];

function groupsFor(level: AccessLevel) {
  return allGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => !link.allow || link.allow(level)),
    }))
    .filter((group) => group.links.length);
}

const initials: Record<AccessLevel, string> = { superadmin: "SA", admin: "AD", staff: "ST" };

/** Live mode: the barangays this account can view and the one being shown. */
export interface LiveWorkspace {
  barangays: BarangayOption[];
  activeId: string | null;
  /** Opened on a barangay subdomain, which fixes the barangay. */
  locked: boolean;
  loadError?: string;
}

function BarangaySwitcher({
  workspace,
  canOnboard,
}: {
  workspace: LiveWorkspace;
  canOnboard: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const active = workspace.barangays.find((item) => item.id === workspace.activeId);
  const chip =
    "inline-flex h-9 max-w-[240px] items-center gap-2 rounded-full border border-[#e3e7e5] bg-white px-3 text-xs font-semibold text-[#2d4252]";
  const canSwitch = !workspace.locked && (workspace.barangays.length > 1 || canOnboard);
  if (!canSwitch)
    return active ? (
      <span className={chip} title={workspace.locked ? "Fixed by this address" : "Barangay shown"}>
        <Building2 size={14} className="shrink-0 text-brand" />
        <span className="truncate">{active.name}</span>
      </span>
    ) : null;

  async function open(id: string) {
    if (id === active?.id) return;
    setBusy(true);
    await fetch("/api/workspace/barangay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => undefined);
    router.refresh();
    setBusy(false);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`${chip} hover:border-[#cfd6d4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
          aria-label="Switch barangay"
          disabled={busy}
        >
          <Building2 size={14} className="shrink-0 text-brand" />
          <span className="truncate">
            {busy ? "Switching…" : (active?.name ?? "Choose barangay")}
          </span>
          <ChevronDown size={14} className="shrink-0 text-[#8a979e]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[60vh] w-64 overflow-y-auto rounded-2xl border-[#e8ebe8] bg-white p-2 shadow-xl"
      >
        <DropdownMenuLabel className="px-3 text-xs text-[#8d999e]">View barangay</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#edf0ec]" />
        {workspace.barangays.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="rounded-xl px-3 py-2.5"
            onSelect={() => open(item.id)}
          >
            <Check
              size={15}
              className={item.id === active?.id ? "text-brand" : "invisible"}
              aria-hidden="true"
            />
            <span className="truncate">{item.name}</span>
          </DropdownMenuItem>
        ))}
        {canOnboard && (
          <>
            <DropdownMenuSeparator className="bg-[#edf0ec]" />
            <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5">
              <Link href="/branding">
                <Plus size={15} /> Onboard a barangay
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Sidebar({
  groups,
  close,
  preview = false,
  workspace,
  canOnboard = false,
}: {
  groups: ReturnType<typeof groupsFor>;
  close?: () => void;
  preview?: boolean;
  workspace?: LiveWorkspace;
  canOnboard?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-[#f2f3f1] text-[#252a2c]">
      <div className="flex h-[94px] shrink-0 items-center px-5">
        <BrandLockup />
      </div>
      {workspace && (
        <div className="px-5 pb-4 md:hidden">
          <BarangaySwitcher workspace={workspace} canOnboard={canOnboard} />
        </div>
      )}
      <nav aria-label="Main navigation" className="odc-scrollbar flex-1 overflow-y-auto px-3 pb-5">
        {groups.map((group) => (
          <div className="mb-5" key={group.label}>
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#a2aaac]">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.links.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    onClick={close}
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-[13px] px-3 text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                      active
                        ? "bg-white text-[#1f262a] shadow-[0_2px_7px_rgba(24,35,40,.07)]"
                        : "text-[#838d91] hover:bg-white/75 hover:text-[#29323a]",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      size={17}
                      strokeWidth={active ? 2.2 : 1.8}
                      className={active ? "text-brand" : ""}
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-[#e5e7e5] px-4 py-4">
        <div className="rounded-2xl bg-white p-3.5 shadow-[0_1px_8px_rgba(24,35,40,.035)]">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-bold text-[#283238]">
              {preview ? "Live workspace" : "Demo workspace"}
            </div>
            <span className="h-2 w-2 rounded-full bg-brand" />
          </div>
          <p className="mt-1 text-[10px] leading-4 text-[#9aa4a5]">
            {preview
              ? "Records come from Supabase for the barangay shown."
              : "Sample financial records for walkthroughs."}
          </p>
          <Link
            href="/settings"
            onClick={close}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-brand hover:underline"
          >
            Workspace settings <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  preview = false,
  account,
  workspace,
}: {
  children: React.ReactNode;
  preview?: boolean;
  account: WorkspaceAccount;
  workspace?: LiveWorkspace;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const signOutForm = useRef<HTMLFormElement>(null);
  const { data, notice, clearNotice, liveRecording } = useFinance();
  const pathname = usePathname();
  const router = useRouter();
  const groups = groupsFor(account.level);
  const current = groups.flatMap((group) => group.links).find((link) => link.href === pathname);
  const pendingCount = data.vouchers.filter((voucher) => voucher.status === "submitted").length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="workspace-root h-dvh w-full bg-[#f7f8f6]">
      <div className="app-frame flex h-full w-full overflow-hidden bg-[#f7f8f6]">
        <aside className="hidden h-full w-[244px] shrink-0 border-r border-[#e8eae7] lg:block">
          <Sidebar groups={groups} preview={preview} />
        </aside>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent className="lg:hidden">
            <SheetTitle className="sr-only">Main navigation</SheetTitle>
            <Sidebar
              groups={groups}
              close={() => setMobileOpen(false)}
              preview={preview}
              workspace={workspace}
              canOnboard={account.level === "superadmin"}
            />
          </SheetContent>
        </Sheet>

        <div className="workspace-content flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-[94px] shrink-0 items-center justify-between gap-4 px-5 sm:px-7 xl:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-xl p-2 text-[#334147] lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={21} />
              </button>
              <h1 className="truncate text-[23px] font-bold tracking-tight text-[#181e22] sm:text-[28px]">
                {current?.label ?? "Dashboard"}
              </h1>
              <span className="hidden rounded-full bg-brand-soft px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-brand sm:inline-flex">
                {liveRecording ? "Live" : preview ? "Read-only" : "Demo"}
              </span>
              {workspace && (
                <div className="hidden md:block">
                  <BarangaySwitcher
                    workspace={workspace}
                    canOnboard={account.level === "superadmin"}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden h-11 w-[190px] items-center gap-2 rounded-full bg-white px-4 text-left text-xs text-[#929b9f] shadow-[0_1px_8px_rgba(24,35,40,.025)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:flex xl:w-[280px]"
                aria-label="Search workspace"
              >
                <Search size={17} /> <span className="flex-1">Search anything...</span>
                <kbd className="rounded border border-[#e7eae8] px-1.5 py-0.5 text-[10px] text-[#a1a9ad]">
                  ⌘ K
                </kbd>
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#677279] md:hidden"
                aria-label="Search workspace"
              >
                <Search size={18} />
              </button>

              {(!preview || liveRecording) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-11 rounded-full px-4 text-xs sm:px-5">
                      <Plus size={15} /> <span className="hidden sm:inline">Create</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-2xl border-[#e8ebe8] bg-white p-2 shadow-xl"
                  >
                    <DropdownMenuLabel className="px-3 text-xs text-[#8d999e]">
                      New record
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#edf0ec]" />
                    <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5">
                      <Link href="/spending">
                        <FileText size={16} /> Expense case
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5">
                      <Link href="/collections">
                        <ReceiptText size={16} /> Collection
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5">
                      <Link href="/deposits">
                        <Landmark size={16} /> Deposit or remittance
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Link
                href="/disbursements"
                className="relative hidden h-11 w-11 place-items-center rounded-full bg-white text-[#68747a] transition-colors hover:text-[#1d2d36] sm:grid"
                aria-label={`${pendingCount} vouchers awaiting review`}
                title="Vouchers awaiting review"
              >
                <Bell size={18} />
                {pendingCount > 0 && (
                  <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-brand" />
                )}
              </Link>
              <Link
                href="/audit"
                className="hidden h-11 w-11 place-items-center rounded-full bg-white text-[#68747a] transition-colors hover:text-[#1d2d36] xl:grid"
                aria-label="Recent activity"
                title="Recent activity"
              >
                <Activity size={18} />
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    aria-label="Open account menu"
                  >
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-[#e2e7e5] text-xs font-extrabold text-[#263b46]">
                        {initials[account.level]}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 rounded-2xl border-[#e8ebe8] bg-white p-2 shadow-xl"
                >
                  <DropdownMenuLabel className="px-3 py-2">
                    <div className="truncate text-xs font-bold text-[#26363e]">
                      {account.email ?? "Demo user"}
                    </div>
                    <div className="mt-1 text-[10px] font-normal text-[#9aa6a9]">
                      {workspace && !workspace.activeId
                        ? accessLabel[account.level]
                        : `${accessLabel[account.level]} · ${data.barangay}`}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#edf0ec]" />
                  {canManageStaff(account.level) && (
                    <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5">
                      <Link href="/staff">
                        <UserCog size={16} /> Staff & access
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {canManageBranding(account.level) && (
                    <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5">
                      <Link href="/branding">
                        <Palette size={16} /> White label
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5">
                    <Link href="/settings">
                      <Settings2 size={16} /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-xl px-3 py-2.5"
                    onSelect={() => signOutForm.current?.requestSubmit()}
                  >
                    <LogOut size={16} /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Kept outside the menu: closing the menu unmounts its content before a nested form could submit. */}
              <form ref={signOutForm} action="/auth/signout" method="post" hidden />
            </div>
          </header>

          {workspace && (
            <div
              role="status"
              className="mx-5 mb-4 rounded-2xl border border-[#fbd6bf] bg-[#fff4eb] px-4 py-3 text-xs font-medium leading-5 text-[#9b5327] sm:mx-7 xl:mx-9"
            >
              {workspace.activeId ? (
                <>
                  {liveRecording
                    ? `Showing ${data.barangay}'s live records. As super admin you can record transactions here; they are saved to the database and audited. Approving a voucher still needs someone other than its creator.`
                    : `Showing ${data.barangay}'s records from Supabase, read-only. Recording transactions here is not enabled until live posting passes verification.`}
                  {workspace.loadError && ` ${workspace.loadError}`}
                </>
              ) : account.level === "superadmin" ? (
                <>
                  No barangay has been onboarded yet.{" "}
                  <Link href="/branding" className="font-bold underline">
                    Onboard one under White label
                  </Link>{" "}
                  to see its records here.
                </>
              ) : (
                "Your account is not linked to an active barangay."
              )}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="mx-5 mb-4 flex items-center justify-between rounded-2xl border border-[#ffe2cf] bg-[#fff6ef] px-4 py-3 text-xs font-medium text-[#a95222] sm:mx-7 xl:mx-9"
            >
              <span>{notice}</span>
              <button onClick={clearNotice} aria-label="Dismiss message" className="ml-4">
                <X size={16} />
              </button>
            </div>
          )}
          <main
            id="main-content"
            className="min-h-0 w-full flex-1 overflow-y-auto px-5 pb-8 sm:px-7 xl:px-9"
          >
            {children}
          </main>
        </div>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search pages and workflows..." />
        <CommandList className="p-2">
          <CommandEmpty>No matching pages found.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.links.map(({ href, label, icon: Icon }) => (
                <CommandItem
                  key={href}
                  value={`${group.label} ${label}`}
                  className="rounded-xl px-3 py-2.5 data-[selected=true]:bg-brand-soft data-[selected=true]:text-brand-strong"
                  onSelect={() => {
                    setSearchOpen(false);
                    router.push(href);
                  }}
                >
                  <Icon size={16} />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
