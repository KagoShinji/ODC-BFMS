"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { accessLabel, accessLevels, type AccessLevel } from "@/lib/auth/roles";
import { brandTitle } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { useBranding } from "@/components/layout/brand";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginBrand, LoginPreview } from "./login-preview";
import styles from "./login.module.css";

type LoginViewProps = {
  mode: "demo" | "supabase";
  demoHint: { email: string; password: string } | null;
  supabaseConfigured: boolean;
  /** Set when opened from a barangay sign-in link. */
  barangayName?: string;
};

export function LoginView({ mode, demoHint, supabaseConfigured, barangayName }: LoginViewProps) {
  const [email, setEmail] = useState(mode === "demo" ? (demoHint?.email ?? "") : "");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState<AccessLevel>("superadmin");
  const [showPassword, setShowPassword] = useState(false);
  const branding = useBranding();
  const title = brandTitle(branding);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "demo") {
        const response = await fetch("/api/demo-auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, level }),
        });
        if (!response.ok) {
          const result = await response.json();
          setError(result.error || "Sign in failed. Please try again.");
          return;
        }
      } else {
        const supabase = createClient();
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) {
          setError(result.error.message);
          return;
        }
      }
      window.location.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page} data-theme="light">
      <section className={styles.story} aria-labelledby="login-story-title">
        <div className={styles.storyBrand}>
          <LoginBrand />
        </div>
        <div className={styles.storyCopy}>
          <p className={styles.eyebrow}>Your barangay. One workspace.</p>
          <h1 id="login-story-title">
            Clear finances.
            <br />
            Better communities.
          </h1>
          <p className={styles.storyDescription}>
            A simpler way to manage your barangay’s budget, collections, and financial reports.
          </p>
        </div>
        <LoginPreview barangayName={barangayName} />
      </section>

      <section className={styles.formPanel} aria-labelledby="login-title">
        <div className={styles.mobileBrand}>
          <LoginBrand />
        </div>
        <div className={styles.formContent}>
          <div className={styles.formHeader}>
            <p className={styles.workspaceLabel}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              {mode === "demo" ? "Demo workspace" : barangayName || "Your financial workspace"}
            </p>
            <h2 id="login-title">Log in</h2>
            <p className={styles.welcome}>Welcome back. Let’s get you signed in.</p>
          </div>
          <Form
            pendingLabel="Signing in…"
            onSubmit={submit}
            className={styles.form}
            aria-busy={busy}
          >
            {mode === "demo" && (
              <div className={styles.roleField}>
                <label htmlFor="login-level">Sign in as</label>
                <select
                  id="login-level"
                  name="level"
                  value={level}
                  onChange={(event) => setLevel(event.target.value as AccessLevel)}
                  className={styles.roleSelect}
                  disabled={busy}
                >
                  {accessLevels.map((option) => (
                    <option key={option} value={option}>
                      {accessLabel[option]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="login-email">Email address</label>
              <div className={styles.inputWrap}>
                <Mail size={18} strokeWidth={1.5} className={styles.inputIcon} aria-hidden="true" />
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={styles.field}
                  placeholder="name@barangay.gov.ph"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  disabled={busy}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="login-password">Password</label>
              <div className={styles.inputWrap}>
                <LockKeyhole
                  size={18}
                  strokeWidth={1.5}
                  className={styles.inputIcon}
                  aria-hidden="true"
                />
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={cn(styles.field, "pr-12")}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  disabled={busy}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <p id="login-error" role="alert" className={styles.error}>
                {error}
              </p>
            )}
            {mode === "supabase" && !supabaseConfigured && (
              <p role="alert" className={styles.configNotice}>
                Supabase is not configured yet. Add its URL and publishable key to the environment.
              </p>
            )}
            <Button
              type="submit"
              variant="accent"
              className={styles.submitButton}
              disabled={busy || (mode === "supabase" && !supabaseConfigured)}
            >
              {busy ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </Button>
          </Form>
          {mode === "demo" && demoHint && (
            <p className={styles.demoHint}>
              Demo: <span>{demoHint.email}</span> <span aria-hidden="true">·</span>{" "}
              <span>{demoHint.password}</span>
            </p>
          )}
          <p className={styles.accessHelp}>
            Need access? <span>Contact your administrator.</span>
          </p>
          <div className={styles.security}>
            <ShieldCheck size={14} strokeWidth={1.5} aria-hidden="true" />
            Secure access to your workspace
          </div>
        </div>
        <p className={styles.footer}>{title}</p>
      </section>
    </main>
  );
}
