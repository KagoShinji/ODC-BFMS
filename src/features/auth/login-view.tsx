"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ChartNoAxesCombined,
  Eye,
  EyeOff,
  FileCheck2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { accessLabel, accessLevels, type AccessLevel } from "@/lib/auth/roles";
import { brandTitle } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { BrandLockup, useBranding } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const levelHint: Record<AccessLevel, string> = {
  superadmin: "All barangays, staff, and white label",
  admin: "Barangay finance and staff accounts",
  staff: "Day-to-day finance work",
};

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
    <main className="grid min-h-screen bg-[#f8f7f3] lg:grid-cols-[1.02fr_.98fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#172a3b] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="pointer-events-none absolute -right-40 -top-36 h-[560px] w-[560px] rounded-full border border-white/8" />
        <div className="pointer-events-none absolute -right-24 -top-20 h-[400px] w-[400px] rounded-full border border-white/8" />
        <div className="pointer-events-none absolute -bottom-36 -left-28 h-[360px] w-[360px] rounded-full bg-brand/10 blur-3xl" />
        <div className="relative">
          <BrandLockup large tone="dark" />
        </div>
        <div className="relative max-w-xl pb-6">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-brand-light">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Finance, made clear
          </div>
          <h1 className="max-w-[560px] text-[44px] font-bold leading-[1.12] tracking-tight xl:text-[54px]">
            Every peso has
            <br />
            <span className="text-brand-light">a clear purpose.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-[#b4c3cd]">
            One organized workspace for your barangay budget, spending, collections and reports.
          </p>
          <div className="mt-9 grid max-w-lg gap-3 sm:grid-cols-3">
            {[
              { icon: Wallet, title: "Know the budget", detail: "Balances at a glance" },
              { icon: FileCheck2, title: "Follow each step", detail: "Linked documents" },
              { icon: ChartNoAxesCombined, title: "Report clearly", detail: "Traceable records" },
            ].map(({ icon: Icon, title, detail }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                <Icon size={19} className="text-brand-light" />
                <div className="mt-4 text-xs font-bold">{title}</div>
                <div className="mt-1 text-[10px] text-[#9eb1be]">{detail}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-2 border-t border-white/10 pt-5 text-[11px] text-[#97acba]">
          <ShieldCheck size={14} /> {title}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10 lg:px-12 xl:px-20">
        <div className="w-full max-w-[430px]">
          <div className="mb-9 lg:hidden">
            <BrandLockup large />
          </div>
          <div className="mb-8">
            <div className="mb-3 inline-flex rounded-full border border-brand/25 bg-brand-soft px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-brand-strong">
              {mode === "demo" ? "Demo workspace" : "Authorized access"}
            </div>
            <h2 className="text-[30px] font-bold tracking-tight text-[#172a3b] sm:text-[34px]">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#81909a]">
              {barangayName
                ? `Sign in to the ${barangayName} financial workspace.`
                : "Sign in to access your financial workspace."}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            {mode === "demo" && (
              <fieldset>
                <legend className="text-xs font-bold text-[#344b5a]">Sign in as</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {accessLevels.map((option) => (
                    <label
                      key={option}
                      className={cn(
                        "cursor-pointer rounded-xl border bg-white px-3 py-2.5 text-xs transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand",
                        level === option
                          ? "border-brand bg-brand-soft"
                          : "border-[#e2e6e4] hover:border-[#cfd6d4]",
                      )}
                    >
                      <input
                        type="radio"
                        name="level"
                        value={option}
                        checked={level === option}
                        onChange={() => setLevel(option)}
                        className="sr-only"
                      />
                      <span className="block font-bold text-[#22343f]">{accessLabel[option]}</span>
                      <span className="mt-0.5 block text-[10px] leading-4 text-[#81909a]">
                        {levelHint[option]}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <label className="block text-xs font-bold text-[#344b5a]">
              Email address
              <div className="relative mt-2">
                <Mail
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-3 text-[#93a0a7]"
                />
                <Input
                  type="email"
                  autoComplete="username"
                  className="h-11 pl-11"
                  placeholder="name@barangay.gov.ph"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </label>
            <label className="block text-xs font-bold text-[#344b5a]">
              Password
              <div className="relative mt-2">
                <LockKeyhole
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-3 text-[#93a0a7]"
                />
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-11 pl-11 pr-11"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1.5 grid h-8 w-8 place-items-center rounded-md text-[#8697a0] hover:bg-[#f1f2ef]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-[#f1c8c3] bg-[#fff1ef] px-3 py-2.5 text-xs text-[#a7473c]"
              >
                {error}
              </p>
            )}
            {mode === "supabase" && !supabaseConfigured && (
              <p
                role="alert"
                className="rounded-lg border border-[#f1d6ad] bg-[#fff6e9] px-3 py-2.5 text-xs text-[#986321]"
              >
                Supabase is not configured yet. Add its URL and publishable key to the environment.
              </p>
            )}
            <Button
              type="submit"
              variant="accent"
              className="h-11 w-full"
              disabled={busy || (mode === "supabase" && !supabaseConfigured)}
            >
              {busy ? "Signing in…" : "Sign in to workspace"} <ArrowRight size={16} />
            </Button>
          </form>
          {mode === "demo" && demoHint && (
            <div className="mt-7 rounded-xl border border-[#e9e9e4] bg-white px-4 py-3.5">
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-brand">
                Demo access
              </div>
              <p className="mt-1 text-xs leading-5 text-[#71828c]">
                Email: <span className="font-semibold text-[#314858]">{demoHint.email}</span> ·
                Password: <span className="font-semibold text-[#314858]">{demoHint.password}</span>
              </p>
              <p className="mt-1 text-xs leading-5 text-[#71828c]">
                The same login opens any access level chosen above.
              </p>
            </div>
          )}
          <p className="mt-8 text-center text-[11px] text-[#9ba6ac]">{title}</p>
        </div>
      </section>
    </main>
  );
}
