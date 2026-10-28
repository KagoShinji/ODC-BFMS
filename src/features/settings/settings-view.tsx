"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, RotateCcw, Settings2 } from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import { MIN_STAFF_PASSWORD } from "@/lib/auth/roles";
import { brandTitle } from "@/lib/branding";
import { createClient } from "@/lib/supabase/client";
import { useBranding } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/financial/shared";

function PasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < MIN_STAFF_PASSWORD || password.length > 72)
      return setMessage({
        ok: false,
        text: `Use ${MIN_STAFF_PASSWORD} to 72 characters for your password.`,
      });
    if (password !== confirm) return setMessage({ ok: false, text: "The passwords do not match." });
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setMessage({ ok: false, text: error.message });
    setPassword("");
    setConfirm("");
    setMessage({ ok: true, text: "Your password was changed." });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account password</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs leading-5 text-[#7b8a93]">
          Replace the temporary password an administrator set for your account.
        </p>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#526575]">
            New password
            <Input
              type="password"
              autoComplete="new-password"
              className="mt-1.5"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label className="text-xs font-semibold text-[#526575]">
            Confirm new password
            <Input
              type="password"
              autoComplete="new-password"
              className="mt-1.5"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" variant="accent" disabled={busy}>
              <KeyRound size={15} /> {busy ? "Saving…" : "Change password"}
            </Button>
            {message && (
              <p
                role={message.ok ? "status" : "alert"}
                className={`text-xs ${message.ok ? "text-[#397758]" : "text-[#a7473c]"}`}
              >
                {message.text}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function SettingsView() {
  const { data, preview, resetDemo } = useFinance();
  const branding = useBranding();
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE CONFIGURATION"
        title="Settings"
        description={
          preview
            ? "Review the live workspace and your account."
            : "Review the current demo workspace and prepare the eventual live connection."
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["System", brandTitle(branding)],
              ["Barangay", data.barangay],
              ["Fiscal year", String(data.fiscalYear)],
              ["Fund", "General Fund"],
              ["Time zone", "Asia/Manila"],
              ["Currency", "Philippine peso (PHP)"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-wrap justify-between gap-2 border-b border-[#f0f1ef] pb-3 text-xs last:border-0"
              >
                <span className="text-[#88969e]">{label}</span>
                <span className="font-semibold text-[#344b5a]">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{preview ? "Live records" : "Demo data"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-lg bg-brand-soft p-4">
              <Settings2 size={18} className="mt-0.5 shrink-0 text-brand" />
              <p className="text-xs leading-5 text-[#6f5a4a]">
                {preview
                  ? "Records are read from Supabase for the barangay shown, under your role's access rules. Recording transactions stays disabled until live posting passes verification."
                  : "The current workspace stores demo records in this browser. It uses synthetic names and balances for walkthroughs."}
              </p>
            </div>
            {!preview && (
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => {
                  if (
                    window.confirm(
                      "Restore the original demo data? Your browser changes will be removed.",
                    )
                  )
                    resetDemo();
                }}
              >
                <RotateCcw size={15} /> Restore demo data
              </Button>
            )}
          </CardContent>
        </Card>
        {preview && <PasswordCard />}
        <Card className={preview ? "" : "lg:col-span-2"}>
          <CardHeader>
            <CardTitle>Supabase connection readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-[#667986]">
              {preview
                ? "Supabase authentication, role checks, and read-only records are active. Live posting and certified reports await verification."
                : "The repository includes environment configuration, browser and server clients, SQL migrations, and policy foundations. Connect an isolated Supabase project and verify authentication, access rules, and financial posting before enabling live transactions."}
            </p>
            <div className="mt-4 rounded-lg border border-[#e7e9e7] bg-[#fafaf8] px-4 py-3 font-mono text-xs text-[#586f7d]">
              DATA_PROVIDER={preview ? "supabase" : "demo"} · NEXT_PUBLIC_SUPABASE_URL ·
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
