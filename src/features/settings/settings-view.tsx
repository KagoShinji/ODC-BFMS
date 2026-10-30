"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, RotateCcw, Settings2 } from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import { MIN_STAFF_PASSWORD } from "@/lib/auth/roles";
import { brandTitle } from "@/lib/branding";
import { createClient } from "@/lib/supabase/client";
import { useBranding } from "@/components/layout/brand";
import { useConfirm } from "@/components/layout/confirm-provider";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/financial/shared";
import { useFeedbackMessage } from "@/hooks/use-feedback-message";

function PasswordCard() {
  const ask = useConfirm();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useFeedbackMessage("Password changed", "Unable to change password");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < MIN_STAFF_PASSWORD || password.length > 72)
      return setMessage({
        ok: false,
        text: `Use ${MIN_STAFF_PASSWORD} to 72 characters for your password.`,
      });
    if (password !== confirm) return setMessage({ ok: false, text: "The passwords do not match." });
    if (
      !(await ask({
        title: "Change your password?",
        description: "Replace your current sign-in password with the new password you entered?",
        confirmLabel: "Change password",
      }))
    )
      return;
    setBusy(true);
    const result = await createClient()
      .auth.updateUser({ password })
      .finally(() => setBusy(false));
    const { error } = result;
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
        <p className="mb-4 text-xs leading-5 text-muted-foreground">
          Replace the temporary password an administrator set for your account.
        </p>
        <Form
          pendingLabel="Saving password…"
          onSubmit={submit}
          className="grid gap-4 sm:grid-cols-2"
        >
          <label className="text-xs font-semibold text-secondary">
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
          <label className="text-xs font-semibold text-secondary">
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
                className={`text-xs ${message.ok ? "text-success" : "text-danger"}`}
              >
                {message.text}
              </p>
            )}
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}

export function SettingsView() {
  const confirm = useConfirm();
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
            : "Review the demo workspace settings."
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
                className="flex flex-wrap justify-between gap-2 border-b border-border pb-3 text-xs last:border-0"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-secondary">{value}</span>
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
              <Settings2 size={18} className="mt-0.5 shrink-0 text-brand-ink" />
              <p className="text-xs leading-5 text-secondary">
                {preview
                  ? "You are viewing records for the selected barangay. Your assigned role determines which actions are available."
                  : "The current workspace stores demo records in this browser. It uses synthetic names and balances for walkthroughs."}
              </p>
            </div>
            {!preview && (
              <Button
                variant="outline"
                className="mt-5"
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Restore demo data?",
                      description:
                        "Restore the original demo data? Your browser changes will be removed.",
                      confirmLabel: "Restore demo data",
                      destructive: true,
                    })
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
      </div>
    </>
  );
}
