"use client";

import { RotateCcw, Settings2 } from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/financial/shared";

export function SettingsView() {
  const { data, preview, resetDemo } = useFinance();
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE CONFIGURATION"
        title="Settings"
        description={
          preview
            ? "Review the Supabase sign-in and sample workspace preview."
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
              ["System", "Barangay Financial Management System by ODC"],
              [preview ? "Sample barangay" : "Barangay", data.barangay],
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
            <CardTitle>Demo data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-lg bg-[#fff4e9] p-4">
              <Settings2 size={18} className="mt-0.5 shrink-0 text-[#e66e29]" />
              <p className="text-xs leading-5 text-[#936847]">
                {preview
                  ? "These records are synthetic preview data. They are not loaded from or saved to Supabase, and financial actions are disabled."
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Supabase connection readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-[#667986]">
              {preview
                ? "Supabase authentication and role checks are active. Financial records on this screen remain sample data while live posting and reports await verification."
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
