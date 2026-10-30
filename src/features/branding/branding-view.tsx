"use client";

import { useRef, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  ImageUp,
  LayoutDashboard,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import {
  brandPalette,
  brandTitle,
  defaultBranding,
  isPortalSlug,
  portalSlug,
  validateBranding,
  type Branding,
} from "@/lib/branding";
import { BrandLockup, BrandMark } from "@/components/layout/brand";
import { PortalLink } from "@/components/layout/portal-link";
import { useConfirm } from "@/components/layout/confirm-provider";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/financial/shared";

const swatches = ["#f56618", "#1f7a5a", "#2563a6", "#7b3fa0", "#b3261e", "#172a3b"];
const selectClass =
  "h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

export interface BrandingScopeItem {
  id: string;
  name: string;
  slug: string;
  /** Null while the barangay uses the system branding. */
  branding: Branding | null;
}

type Message = { ok: boolean; text: string } | null;

function StatusLine({ message, className = "" }: { message: Message; className?: string }) {
  if (!message) return null;
  return (
    <p
      role={message.ok ? "status" : "alert"}
      className={`text-xs ${message.ok ? "text-success" : "text-danger"} ${className}`}
    >
      {message.text}
    </p>
  );
}

async function send(path: string, init: RequestInit) {
  try {
    const response = await fetch(path, init);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { error: (result.error as string) || "The request failed." };
    return { result };
  } catch {
    return { error: "The server could not be reached. Try again." };
  }
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function BrandEditor({
  mode,
  scope,
  initial,
  fallback,
  custom,
}: {
  mode: "demo" | "supabase";
  scope: string;
  initial: Branding;
  /** What the scope shows after a reset. */
  fallback: Branding;
  custom: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [operation, setOperation] = useState<"save" | "reset" | "upload" | null>(null);
  const busy = operation !== null;
  const [message, setMessage] = useState<Message>(null);
  const check = validateBranding(draft);
  const preview = check.ok ? check.value : saved;
  const changed = JSON.stringify(preview) !== JSON.stringify(saved) || !custom;
  const isSystem = scope === "system";
  const set = (key: keyof Branding) => (value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!check.ok) return setMessage({ ok: false, text: check.error });
    setOperation("save");
    const { error } = await send("/api/branding", jsonInit("PUT", { ...check.value, scope }));
    setOperation(null);
    if (error) return setMessage({ ok: false, text: error });
    setSaved(check.value);
    setMessage({ ok: true, text: "White-label settings saved." });
    router.refresh();
  }

  async function reset() {
    const prompt = isSystem
      ? "Restore the default system name, mark, and colors?"
      : "Remove this barangay's branding and logo? It will use the system branding again.";
    if (
      !(await confirm({
        title: "Reset branding?",
        description: prompt,
        confirmLabel: "Reset branding",
        destructive: true,
      }))
    )
      return;
    setOperation("reset");
    const { error } = await send(`/api/branding?scope=${encodeURIComponent(scope)}`, {
      method: "DELETE",
    });
    setOperation(null);
    if (error) return setMessage({ ok: false, text: error });
    setSaved(fallback);
    setDraft(fallback);
    setMessage({ ok: true, text: isSystem ? "Default branding restored." : "Branding removed." });
    router.refresh();
  }

  async function upload(file: File) {
    setOperation("upload");
    setMessage(null);
    const form = new FormData();
    form.set("scope", scope);
    form.set("file", file);
    const { result, error } = await send("/api/branding/logo", { method: "POST", body: form });
    setOperation(null);
    if (fileInput.current) fileInput.current.value = "";
    if (error) return setMessage({ ok: false, text: error });
    const logoUrl = (result.branding as Branding).logoUrl;
    setSaved(result.branding);
    setDraft((current) => ({ ...current, logoUrl }));
    setMessage({ ok: true, text: "Logo uploaded and applied." });
    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>{isSystem ? "System default branding" : "Barangay branding"}</CardTitle>
        </CardHeader>
        <CardContent>
          {!isSystem && !custom && (
            <p className="mb-4 rounded-lg bg-brand-soft px-3 py-2.5 text-xs leading-5 text-secondary">
              This barangay uses the system branding. Saving or uploading a logo gives it its own.
            </p>
          )}
          <Form
            pendingLabel="Saving changes…"
            onSubmit={save}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <BrandMark large branding={preview} />
              <div className="min-w-0 flex-1 space-y-2">
                {mode === "supabase" ? (
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      id={`logo-${scope}`}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) upload(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      loading={operation === "upload"}
                      loadingText="Uploading…"
                      onClick={() => fileInput.current?.click()}
                    >
                      <ImageUp size={15} /> {draft.logoUrl ? "Replace logo" : "Upload logo"}
                    </Button>
                    {draft.logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => set("logoUrl")("")}
                      >
                        <Trash2 size={15} /> Remove logo
                      </Button>
                    )}
                  </div>
                ) : (
                  <Input
                    type="url"
                    value={draft.logoUrl}
                    maxLength={500}
                    onChange={(event) => set("logoUrl")(event.target.value)}
                    placeholder="https://example.gov.ph/logo.png"
                    aria-label="Logo image link"
                  />
                )}
                <p className="text-[11px] leading-4 text-muted-foreground">
                  {mode === "supabase"
                    ? "PNG, JPEG, or WebP up to 1 MB; a square image works best. Without a logo, the text mark is shown."
                    : "In the demo, paste a square https image link instead of uploading a file."}
                </p>
              </div>
            </div>
            <label className="text-xs font-semibold text-secondary sm:col-span-2">
              System name
              <Input
                className="mt-1.5"
                value={draft.appName}
                maxLength={80}
                onChange={(event) => set("appName")(event.target.value)}
                required
              />
            </label>
            <label className="text-xs font-semibold text-secondary">
              Organization
              <Input
                className="mt-1.5"
                value={draft.organizationName}
                maxLength={40}
                onChange={(event) => set("organizationName")(event.target.value)}
                placeholder="Leave blank to hide “by …”"
              />
            </label>
            <label className="text-xs font-semibold text-secondary">
              Text mark (1–4 characters)
              <Input
                className="mt-1.5"
                value={draft.markText}
                maxLength={4}
                onChange={(event) => set("markText")(event.target.value)}
                required
              />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-xs font-semibold text-secondary">Accent color</legend>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {swatches.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => set("accentColor")(color)}
                    className="h-8 w-8 rounded-full border-2 border-card shadow-[0_0_0_1px_#dfe3e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    style={{
                      backgroundColor: color,
                      boxShadow:
                        draft.accentColor.toLowerCase() === color
                          ? `0 0 0 2px ${color}`
                          : undefined,
                    }}
                    aria-label={`Use ${color}`}
                    aria-pressed={draft.accentColor.toLowerCase() === color}
                  />
                ))}
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(draft.accentColor) ? draft.accentColor : "#f56618"}
                  onChange={(event) => set("accentColor")(event.target.value)}
                  className="h-9 w-11 cursor-pointer rounded-lg border border-border bg-card p-1"
                  aria-label="Pick a custom accent color"
                />
                <Input
                  className="w-28 font-mono"
                  value={draft.accentColor}
                  maxLength={7}
                  onChange={(event) => set("accentColor")(event.target.value)}
                  aria-label="Accent color hex value"
                />
              </div>
            </fieldset>
            {!check.ok && (
              <p role="alert" className="text-xs text-danger sm:col-span-2">
                {check.error}
              </p>
            )}
            <StatusLine message={message} className="sm:col-span-2" />
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <Button type="submit" variant="accent" disabled={busy || !check.ok || !changed}>
                <Save size={15} /> {operation === "save" ? "Saving…" : "Save changes"}
              </Button>
              {(isSystem || custom) && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  loading={operation === "reset"}
                  loadingText="Resetting…"
                  onClick={reset}
                >
                  <RotateCcw size={15} /> {isSystem ? "Restore defaults" : "Use system branding"}
                </Button>
              )}
            </div>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={brandPalette(preview.accentColor) as CSSProperties} className="space-y-4">
            <div className="rounded-2xl bg-sidebar p-4">
              <BrandLockup branding={preview} />
              <div className="mt-4 space-y-1">
                <div className="flex items-center gap-3 rounded-[13px] bg-card px-3 py-2.5 text-[12px] font-semibold text-foreground shadow-[0_2px_7px_rgba(24,35,40,.07)]">
                  <LayoutDashboard size={17} className="text-brand-ink" /> Dashboard
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 text-[12px] font-semibold text-muted-foreground">
                  <Wallet size={17} /> Budget
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-[#172a3b] p-5">
              <BrandLockup branding={preview} tone="dark" large />
              <div className="mt-5 text-lg font-bold leading-snug text-white">
                Every peso has <span className="text-brand-light">a clear purpose.</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground">
                Sign in to workspace <ArrowRight size={16} />
              </span>
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-brand-ink">
                Badge
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Browser title: {brandTitle(preview)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OnboardForm({ onCreated }: { onCreated(id: string): void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const link = slugEdited ? slug : name.trim() ? portalSlug(name) : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (link && !isPortalSlug(link))
      return setMessage({
        ok: false,
        text: "Use lowercase letters, numbers, and single hyphens for the sign-in link.",
      });
    setBusy(true);
    const { result, error } = await send("/api/barangays", jsonInit("POST", { name, slug: link }));
    setBusy(false);
    if (error) return setMessage({ ok: false, text: error });
    onCreated(result.id);
  }

  return (
    <Form
      pendingLabel="Creating barangay…"
      onSubmit={submit}
      className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
    >
      <label className="text-xs font-semibold text-secondary">
        Barangay name
        <Input
          className="mt-1.5"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Barangay San Isidro"
          required
        />
      </label>
      <label className="text-xs font-semibold text-secondary">
        Sign-in link
        <div className="mt-1.5 flex items-center rounded-xl border border-border bg-card pl-3 text-sm focus-within:ring-2 focus-within:ring-brand">
          <span className="text-muted-foreground">/b/</span>
          <input
            className="h-10 min-w-0 flex-1 rounded-r-xl bg-transparent px-1 text-foreground focus:outline-none"
            value={link}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value.toLowerCase());
            }}
            placeholder="barangay-san-isidro"
          />
        </div>
      </label>
      <Button type="submit" variant="accent" disabled={busy}>
        <Plus size={16} /> {busy ? "Creating…" : "Create barangay"}
      </Button>
      <StatusLine message={message} className="md:col-span-3" />
    </Form>
  );
}

function SignInLinkCard({ barangay }: { barangay: BrandingScopeItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [slug, setSlug] = useState(barangay.slug);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const { error } = await send(
      "/api/barangays",
      jsonInit("PATCH", { id: barangay.id, slug: slug.trim().toLowerCase() }),
    );
    setBusy(false);
    if (error) return setMessage({ ok: false, text: error });
    setEditing(false);
    setMessage({ ok: true, text: "Sign-in link updated. Share the new link with its staff." });
    router.refresh();
  }

  return (
    <Card className="mb-5">
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground">{barangay.name} sign-in link</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Staff who open this link see the barangay&apos;s own branding before they sign in.
          </p>
          <div className="mt-3">
            {editing ? (
              <Form
                pendingLabel="Saving changes…"
                onSubmit={submit}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="text-sm text-muted-foreground">/b/</span>
                <Input
                  className="w-64"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  aria-label="Sign-in link"
                  required
                />
                <Button type="submit" size="sm" variant="accent" disabled={busy}>
                  Save link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setSlug(barangay.slug);
                  }}
                >
                  Cancel
                </Button>
              </Form>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <PortalLink slug={barangay.slug} />
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  Edit link
                </Button>
              </div>
            )}
            <StatusLine message={message} className="mt-2" />
          </div>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href={`/staff?barangay=${barangay.id}`}>
            <UserPlus size={15} /> Add its administrator
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function BrandingView({
  mode,
  system,
  barangays,
  scope,
  error,
}: {
  mode: "demo" | "supabase";
  system: Branding;
  barangays: BrandingScopeItem[];
  scope: string;
  error?: string;
}) {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState(false);
  const selected = barangays.find((item) => item.id === scope);
  const open = (id: string) => router.push(id === "system" ? "/branding" : `/branding?scope=${id}`);
  const initial = selected ? (selected.branding ?? system) : system;

  return (
    <>
      <PageHeading
        eyebrow="SUPER ADMIN"
        title="White label"
        description={
          mode === "demo"
            ? "Rename and recolor the system. In the demo, these settings are saved in this browser."
            : "Set the system default branding, or give each barangay its own name, logo, colors, and sign-in link."
        }
        action={
          mode === "supabase" && (
            <>
              <select
                aria-label="Branding scope"
                value={selected?.id ?? "system"}
                onChange={(event) => open(event.target.value)}
                className={`${selectClass} max-w-[240px]`}
              >
                <option value="system">System default</option>
                {barangays.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.branding ? "" : " (system branding)"}
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={() => setOnboarding(!onboarding)}>
                <Building2 size={16} /> Onboard barangay
              </Button>
            </>
          )
        }
      />
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs text-danger"
        >
          {error}
        </p>
      )}
      {onboarding && (
        <Card className="mb-5 border-brand/40">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Onboard a barangay</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Create the barangay and its sign-in link, then set its branding and add its
                administrator.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOnboarding(false)}
              aria-label="Close form"
            >
              <X size={17} />
            </Button>
          </CardHeader>
          <CardContent>
            <OnboardForm
              onCreated={(id) => {
                setOnboarding(false);
                open(id);
              }}
            />
          </CardContent>
        </Card>
      )}
      {selected && <SignInLinkCard key={`${selected.id}-${selected.slug}`} barangay={selected} />}
      <BrandEditor
        key={scope}
        mode={mode}
        scope={selected?.id ?? "system"}
        initial={initial}
        fallback={selected ? system : defaultBranding}
        custom={selected ? Boolean(selected.branding) : true}
      />
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Only super admins can open this page. Barangay staff see their barangay&apos;s branding
        after signing in; super admins and barangays without their own branding use the system
        default ({brandTitle(defaultBranding)} unless changed).
      </p>
    </>
  );
}
