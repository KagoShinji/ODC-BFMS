import { CircleAlert, Database, LockKeyhole, LogOut } from "lucide-react";
import { BrandLockup } from "@/components/layout/brand";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

type State = "missing-config" | "migration-pending" | "membership-pending";
const content: Record<State, { title: string; description: string; icon: typeof Database }> = {
  "missing-config": {
    title: "Workspace setup needed",
    description:
      "The workspace connection has not been configured. Contact your system administrator for help.",
    icon: CircleAlert,
  },
  "migration-pending": {
    title: "Workspace setup pending",
    description:
      "Workspace records or access settings are not ready. Contact your system administrator to complete setup.",
    icon: Database,
  },
  "membership-pending": {
    title: "Membership pending",
    description:
      "Your account is signed in but has no active barangay membership or system administrator role. An administrator must assign access.",
    icon: LockKeyhole,
  },
};

export function LiveModeView({ state, email }: { state: State; email?: string }) {
  const item = content[state];
  const Icon = item.icon;
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-lg">
        <div className="mb-7">
          <BrandLockup large />
        </div>
        <div className="rounded-2xl border border-border bg-card p-7 shadow-[0_15px_40px_rgba(21,42,60,.08)]">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand-ink">
            <Icon size={24} />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[.17em] text-brand-ink">
            LIVE CONNECTION
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{item.title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
          {email && (
            <p className="mt-5 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Signed in as <strong>{email}</strong>
            </p>
          )}
          <div className="mt-6 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
            Access to your barangay&apos;s records and financial actions depends on your assigned
            role.
          </div>
          {email && (
            <Form action="/auth/signout" method="post" className="mt-5" pendingLabel="Signing out…">
              <Button
                type="submit"
                variant="outline"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-secondary hover:bg-muted"
              >
                <LogOut size={14} /> Sign out
              </Button>
            </Form>
          )}
        </div>
      </div>
    </main>
  );
}
