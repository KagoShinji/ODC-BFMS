"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Eye,
  EyeOff,
  Plus,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import type { StaffDirectory } from "@/data/supabase/staff-repository";
import {
  assignableRoles,
  canManageRole,
  MIN_STAFF_PASSWORD,
  roleLabel,
  type AccessLevel,
  type MemberRole,
  type NewStaff,
  type StaffMember,
} from "@/lib/auth/roles";
import { displayDate } from "@/lib/utils";
import { PortalLink } from "@/components/layout/portal-link";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/layout/confirm-provider";
import { usePendingAction } from "@/hooks/use-pending-action";
import { ActionError, Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  EmptyState,
  PageHeading,
  SearchField,
  StatusBadge,
  tableClass,
  tdClass,
  thClass,
} from "@/components/financial/shared";
import { useDemoStaff } from "./demo-staff";
import { PageAccessEditor } from "./page-access-editor";
import type { ConfigurablePage } from "@/lib/auth/page-access";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const roleDescription: Record<MemberRole, string> = {
  admin: "Manages staff accounts and oversees barangay finance.",
  encoder: "Records expense cases and drafts vouchers.",
  procurement: "Moves purchases through PR, RFQ, PO and AIR.",
  budget: "Monitors appropriations and obligations.",
  approver: "Reviews and approves disbursement vouchers.",
  treasurer: "Records payments, deposits and remittances.",
  collector: "Issues official receipts for collections.",
  auditor: "Reviews records and the audit trail.",
};

const selectClass =
  "mt-1.5 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

type Message = { ok: boolean; text: string } | null;

function StatusLine({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p
      role={message.ok ? "status" : "alert"}
      className={`text-xs ${message.ok ? "text-success" : "text-danger"}`}
    >
      {message.text}
    </p>
  );
}

function StaffDirectoryView({
  level,
  scope,
  members,
  requirePassword,
  addDisabledReason,
  onAdd,
  onSetActive,
  onSetPages,
  toolbar,
  beforeTable,
  footnote,
}: {
  level: AccessLevel;
  scope: string;
  members: StaffMember[];
  requirePassword: boolean;
  addDisabledReason?: string;
  onAdd(input: NewStaff): Promise<string | null>;
  onSetActive(member: StaffMember, active: boolean): Promise<string | null>;
  onSetPages(member: StaffMember, pages: ConfigurablePage[] | null): Promise<string | null>;
  toolbar?: ReactNode;
  beforeTable?: ReactNode;
  footnote: string;
}) {
  const confirm = useConfirm();
  const actions = usePendingAction();
  const roles = assignableRoles(level);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("encoder");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();
  const [busy, setBusy] = useState(false);
  const [formMessage, setFormMessage] = useState<Message>(null);
  const [listMessage, setListMessage] = useState<Message>(null);
  const [newPages, setNewPages] = useState<ConfigurablePage[] | null | undefined>(undefined);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [editPages, setEditPages] = useState<ConfigurablePage[] | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editMessage, setEditMessage] = useState<Message>(null);
  const existing = members.find(
    (member) => member.email.toLowerCase() === email.trim().toLowerCase(),
  );
  const rolesFor = (userId: string) =>
    members
      .filter((member) => member.userId === userId && member.active)
      .map((member) => member.role);
  const canCustomize = (member: StaffMember) =>
    !member.isSystemAdmin &&
    rolesFor(member.userId).length > 0 &&
    (level === "superadmin" || !rolesFor(member.userId).includes("admin"));
  const newAccountRoles = [...new Set([...(existing ? rolesFor(existing.userId) : []), role])];

  const filtered = members.filter((member) =>
    `${member.fullName} ${member.email} ${roleLabel[member.role]}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const activeAdmins = members.filter((member) => member.active && member.role === "admin");
  const activeStaff = members.filter((member) => member.active && member.role !== "admin");
  const people = new Set(members.map((member) => member.userId)).size;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    let error: string | null;
    try {
      error = await onAdd({
        fullName,
        email,
        role,
        password: requirePassword ? password : undefined,
        pages: existing && !canCustomize(existing) ? undefined : newPages,
        pageAccessVersion: existing?.pageAccessVersion ?? 0,
      });
    } finally {
      setBusy(false);
    }
    if (error) return setFormMessage({ ok: false, text: error });
    setListMessage({ ok: true, text: `${fullName.trim()} was added as ${roleLabel[role]}.` });
    setFormMessage(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setNewPages(undefined);
    setOpen(false);
  }

  async function savePages(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setEditBusy(true);
    try {
      const error = await onSetPages(editing, editPages);
      if (error) return setEditMessage({ ok: false, text: error });
      setListMessage({ ok: true, text: `${editing.fullName}'s page access was saved.` });
      setEditing(null);
    } finally {
      setEditBusy(false);
    }
  }

  async function toggle(member: StaffMember) {
    const active = !member.active;
    if (
      !active &&
      !(await confirm({
        title: "Remove staff access?",
        description: `Remove ${roleLabel[member.role]} access for ${member.fullName}?`,
        confirmLabel: "Remove access",
        destructive: true,
      }))
    )
      return;
    await actions.run(`${member.userId}:${member.role}`, async () => {
      const error = await onSetActive(member, active);
      setListMessage(
        error
          ? { ok: false, text: error }
          : {
              ok: true,
              text: `${member.fullName}'s ${roleLabel[member.role]} access was ${active ? "restored" : "deactivated"}.`,
            },
      );
    });
  }

  return (
    <>
      <PageHeading
        eyebrow="ACCESS MANAGEMENT"
        title="Staff & access"
        description={
          level === "superadmin"
            ? "Add administrators and staff accounts, and control who can work in each barangay."
            : "Add staff accounts for your barangay and assign their roles. Only a super admin can add administrators."
        }
        action={
          <>
            {toolbar}
            <Button
              variant="accent"
              onClick={() => {
                setOpen(!open);
                setShowPassword(false);
              }}
              disabled={Boolean(addDisabledReason)}
              title={addDisabledReason}
            >
              <UserPlus size={16} /> {level === "superadmin" ? "Add account" : "Add staff"}
            </Button>
          </>
        }
      />
      <ActionError error={actions.error} />
      {addDisabledReason && (
        <div
          role="status"
          className="mb-5 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs leading-5 text-warning"
        >
          {addDisabledReason}
        </div>
      )}
      {beforeTable}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Administrators", value: activeAdmins.length, icon: ShieldCheck },
          { label: "Active staff roles", value: activeStaff.length, icon: UserCheck },
          { label: "People with access records", value: people, icon: Building2 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand-ink">
                <Icon size={20} />
              </div>
              <div>
                <div className="text-[23px] font-bold tracking-tight text-foreground">{value}</div>
                <div className="text-xs font-semibold text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {open && (
        <Card className="mb-6 border-brand/40">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>
              {level === "superadmin"
                ? "Add an administrator or staff account"
                : "Add a staff account"}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setOpen(false);
                setShowPassword(false);
              }}
              aria-label="Close form"
            >
              <X size={17} />
            </Button>
          </CardHeader>
          <CardContent>
            <Form
              pendingLabel="Saving staff…"
              onSubmit={submit}
              className={`grid gap-4 md:grid-cols-2 ${requirePassword ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
            >
              <label className="text-xs font-semibold text-secondary">
                Full name
                <Input
                  className="mt-1.5"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Juan Dela Cruz"
                  autoComplete="off"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                Email address
                <Input
                  type="email"
                  className="mt-1.5"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@barangay.gov.ph"
                  autoComplete="off"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                Role
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as MemberRole)}
                  className={selectClass}
                >
                  {roles.map((option) => (
                    <option key={option} value={option}>
                      {roleLabel[option]}
                    </option>
                  ))}
                </select>
              </label>
              {requirePassword && (
                <div>
                  <label htmlFor={passwordId} className="text-xs font-semibold text-secondary">
                    Temporary password
                  </label>
                  <div className="relative mt-1.5">
                    <Input
                      id={passwordId}
                      type={showPassword ? "text" : "password"}
                      className="pr-11"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={`At least ${MIN_STAFF_PASSWORD} characters`}
                      minLength={MIN_STAFF_PASSWORD}
                      maxLength={72}
                      autoComplete="new-password"
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                      aria-label={
                        showPassword ? "Hide temporary password" : "Show temporary password"
                      }
                      aria-pressed={showPassword}
                      aria-controls={passwordId}
                      disabled={busy}
                    >
                      {showPassword ? (
                        <EyeOff size={17} aria-hidden="true" />
                      ) : (
                        <Eye size={17} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {(!existing || canCustomize(existing)) && (
                <div className="md:col-span-2 xl:col-span-full">
                  <PageAccessEditor
                    roles={newAccountRoles}
                    value={newPages === undefined ? (existing?.pageOverride ?? null) : newPages}
                    onChange={setNewPages}
                    disabled={busy}
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-full">
                <Button type="submit" variant="accent" disabled={busy}>
                  <Plus size={16} /> {busy ? "Adding…" : "Add to " + scope}
                </Button>
                <span className="text-xs text-muted-foreground">{roleDescription[role]}</span>
              </div>
              {requirePassword && (
                <p className="text-[11px] leading-5 text-muted-foreground md:col-span-2 xl:col-span-full">
                  The password is only needed for a new sign-in account. Share it privately; the
                  person can change it under Settings. An existing account keeps its password and
                  receives the new role.
                </p>
              )}
              <div className="md:col-span-2 xl:col-span-full">
                <StatusLine message={formMessage} />
              </div>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{scope}</CardTitle>
            <div className="mt-1">
              <StatusLine message={listMessage} />
            </div>
          </div>
          <SearchField value={query} onChange={setQuery} placeholder="Search staff..." />
        </CardHeader>
        <CardContent className="odc-scrollbar overflow-x-auto p-0">
          {filtered.length ? (
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Role</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Added</th>
                  <th className={thClass}>Pages</th>
                  <th className={`${thClass} text-right`}>Access</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => {
                  const allowed = canManageRole(level, member.role);
                  return (
                    <tr key={`${member.userId}-${member.role}`}>
                      <td className={tdClass}>
                        <div className="font-semibold text-foreground">{member.fullName}</div>
                        <div className="text-[11px] text-muted-foreground">{member.email}</div>
                      </td>
                      <td className={tdClass}>
                        <Badge
                          className={
                            member.role === "admin"
                              ? "bg-brand-soft text-brand-ink"
                              : "bg-muted text-secondary"
                          }
                        >
                          {roleLabel[member.role]}
                        </Badge>
                      </td>
                      <td className={tdClass}>
                        <StatusBadge status={member.active ? "active" : "inactive"} />
                      </td>
                      <td className={tdClass}>
                        {member.createdAt ? displayDate(member.createdAt.slice(0, 10)) : "—"}
                      </td>
                      <td className={tdClass}>
                        <div className="mb-1.5 text-[10px] text-muted-foreground">
                          {member.isSystemAdmin
                            ? "All pages"
                            : member.pageOverride == null
                              ? "Role defaults"
                              : `${member.pageOverride.length} custom pages`}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!canCustomize(member)}
                          title={
                            member.isSystemAdmin
                              ? "Super admins always have access to all pages."
                              : !canCustomize(member)
                                ? "An active account is required; administrator pages are managed by a super admin."
                                : undefined
                          }
                          onClick={() => {
                            setEditing(member);
                            setEditPages(member.pageOverride ?? null);
                            setEditMessage(null);
                          }}
                        >
                          Customize pages
                        </Button>
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!allowed || actions.pending !== null}
                          loading={actions.pending === `${member.userId}:${member.role}`}
                          loadingText="Updating…"
                          title={
                            allowed
                              ? undefined
                              : "Only a super admin can change administrator access."
                          }
                          onClick={() => toggle(member)}
                        >
                          {member.active ? <UserX size={14} /> : <UserCheck size={14} />}
                          {member.active ? "Deactivate" : "Reactivate"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title={members.length ? "No matching staff" : "No staff yet"}
              description={
                members.length
                  ? "Try a different name, email, or role."
                  : "Add the first account to give someone access."
              }
            />
          )}
        </CardContent>
      </Card>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">{footnote}</p>
      <Dialog
        open={editing !== null}
        onOpenChange={(value) => {
          if (!value && !editBusy) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pages for {editing?.fullName}</DialogTitle>
            <DialogDescription>
              This selection applies to this person across all their active roles in {scope}.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <Form onSubmit={savePages} pendingLabel="Saving page access…" className="space-y-4">
              <PageAccessEditor
                roles={rolesFor(editing.userId)}
                value={editPages}
                onChange={setEditPages}
                disabled={editBusy}
              />
              <StatusLine message={editMessage} />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={editBusy}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="accent" disabled={editBusy}>
                  {editBusy ? "Saving…" : "Save page access"}
                </Button>
              </div>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DemoStaffView({ level }: { level: AccessLevel }) {
  const { data } = useFinance();
  const { members, loaded, add, setActive, setPages } = useDemoStaff(level);
  if (!loaded) return null;
  return (
    <StaffDirectoryView
      level={level}
      scope={data.barangay}
      members={members}
      requirePassword={false}
      onAdd={add}
      onSetActive={setActive}
      onSetPages={setPages}
      footnote="Demo staff entries are saved in this browser and cannot sign in. To try another access level, sign out and choose it on the sign-in page."
    />
  );
}

async function send(path: string, method: string, body: unknown) {
  try {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { error: (result.error as string) || "The request failed." };
    return { result };
  } catch {
    return { error: "The server could not be reached. Try again." };
  }
}

function NewBarangayForm({ onCreated }: { onCreated(id: string): void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const { result, error } = await send("/api/barangays", "POST", { name });
    setBusy(false);
    if (error) return setMessage({ ok: false, text: error });
    setName("");
    onCreated(result.id);
  }
  return (
    <Form
      pendingLabel="Creating barangay…"
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3"
    >
      <label className="min-w-[220px] flex-1 text-xs font-semibold text-secondary">
        Barangay name
        <Input
          className="mt-1.5"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Barangay San Isidro"
          required
        />
      </label>
      <Button type="submit" variant="accent" disabled={busy}>
        <Plus size={16} /> {busy ? "Creating…" : "Create barangay"}
      </Button>
      <StatusLine message={message} />
    </Form>
  );
}

export function LiveStaffView({
  level,
  directory,
}: {
  level: AccessLevel;
  directory: StaffDirectory;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const selected = directory.barangays.find((item) => item.id === directory.barangayId);
  const openBarangay = (id: string) => {
    setCreating(false);
    router.push(`/staff?barangay=${encodeURIComponent(id)}`);
  };

  if (directory.error || !selected) {
    return (
      <>
        <PageHeading
          eyebrow="ACCESS MANAGEMENT"
          title="Staff & access"
          description="Add administrators and staff accounts for each barangay."
        />
        <Card>
          <CardContent className="p-6">
            {directory.error ? (
              <p role="alert" className="text-sm text-danger">
                {directory.error}
              </p>
            ) : level === "superadmin" ? (
              <>
                <h3 className="mb-1 text-sm font-bold text-foreground">
                  Create the first barangay
                </h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  Staff and administrators are assigned to a barangay.
                </p>
                <NewBarangayForm onCreated={openBarangay} />
              </>
            ) : (
              <EmptyState
                title="No barangay to manage"
                description="Your administrator role is not linked to an active barangay."
              />
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  const toolbar = (
    <>
      {directory.barangays.length > 1 && (
        <select
          aria-label="Barangay"
          value={selected.id}
          onChange={(event) => openBarangay(event.target.value)}
          className={`${selectClass} mt-0 w-auto max-w-[220px]`}
        >
          {directory.barangays.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      )}
      {level === "superadmin" && (
        <Button variant="outline" onClick={() => setCreating(!creating)}>
          <Building2 size={16} /> New barangay
        </Button>
      )}
    </>
  );

  return (
    <StaffDirectoryView
      key={selected.id}
      level={level}
      scope={selected.name}
      members={directory.members}
      requirePassword
      addDisabledReason={
        directory.canCreateAccounts
          ? undefined
          : "Account creation is unavailable. Contact your system administrator to enable it. Existing roles can still be deactivated or restored."
      }
      toolbar={toolbar}
      beforeTable={
        <>
          {creating && (
            <Card className="mb-6">
              <CardContent className="p-5">
                <NewBarangayForm onCreated={openBarangay} />
              </CardContent>
            </Card>
          )}
          <Card className="mb-6">
            <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-bold text-foreground">Staff sign-in link</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Share this with new staff. It opens {selected.name}&apos;s branded sign-in page.
                </p>
              </div>
              <PortalLink slug={selected.slug} />
            </CardContent>
          </Card>
        </>
      }
      onAdd={async (input) => {
        const { error } = await send("/api/staff", "POST", { ...input, barangayId: selected.id });
        if (!error) router.refresh();
        return error ?? null;
      }}
      onSetActive={async (member, active) => {
        const { error } = await send("/api/staff", "PATCH", {
          barangayId: selected.id,
          userId: member.userId,
          role: member.role,
          active,
        });
        if (!error) router.refresh();
        return error ?? null;
      }}
      onSetPages={async (member, pages) => {
        const { error } = await send("/api/staff", "PATCH", {
          action: "pages",
          barangayId: selected.id,
          userId: member.userId,
          pages,
          pageAccessVersion: member.pageAccessVersion ?? 0,
        });
        if (!error) router.refresh();
        return error ?? null;
      }}
      footnote="Each role is a separate barangay membership. Deactivating a role removes that access the next time the person loads a page; the sign-in account itself is kept."
    />
  );
}
