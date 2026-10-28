import { CircleAlert, Database, LockKeyhole, LogOut } from "lucide-react";

type State = "missing-config" | "migration-pending" | "membership-pending";
const content: Record<State, { title: string; description: string; icon: typeof Database }> = {
  "missing-config": {
    title: "Supabase configuration needed",
    description:
      "Add the project URL and publishable key to the environment before opening live mode.",
    icon: CircleAlert,
  },
  "migration-pending": {
    title: "Database schema pending",
    description:
      "The Supabase project is reachable, but its BFMS tables or access policies are not ready. Apply the reviewed migrations.",
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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] p-5">
      <div className="w-full max-w-lg">
        <div className="mb-7 flex items-center gap-3">
          <div className="odc-mark odc-mark--large" aria-hidden="true">
            ODC
          </div>
          <div>
            <div className="text-lg font-bold leading-tight text-[#172a3b]">
              Barangay Financial
              <br />
              Management System
            </div>
            <div className="mt-1 text-xs font-bold text-[#ed6c27]">by ODC</div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#e6e8e5] bg-white p-7 shadow-[0_15px_40px_rgba(21,42,60,.08)]">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-[#fff0e5] text-[#eb6b22]">
            <Icon size={24} />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[.17em] text-[#e6712d]">
            LIVE CONNECTION
          </div>
          <h1 className="mt-2 text-2xl font-bold text-[#172a3b]">{item.title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#778893]">{item.description}</p>
          {email && (
            <p className="mt-5 rounded-lg bg-[#f6f7f5] p-3 text-xs text-[#5b7080]">
              Signed in as <strong>{email}</strong>
            </p>
          )}
          <div className="mt-6 border-t border-[#eff0ec] pt-5 text-xs leading-5 text-[#9aa6ab]">
            Authorized users can open a sample-data preview. Live financial posting remains disabled
            until the controls and workflows pass staging verification.
          </div>
          {email && (
            <form action="/auth/signout" method="post" className="mt-5">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-[#dfe5e3] bg-white px-3 py-2 text-xs font-semibold text-[#526c7b] hover:bg-[#f6f7f4]"
              >
                <LogOut size={14} /> Sign out
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
