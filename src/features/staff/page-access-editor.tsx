"use client";

import {
  configurablePages,
  defaultPagesForRoles,
  type ConfigurablePage,
} from "@/lib/auth/page-access";
import { roleLabel, type MemberRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";

export function PageAccessEditor({
  roles,
  value,
  onChange,
  disabled = false,
}: {
  roles: MemberRole[];
  value: ConfigurablePage[] | null;
  onChange(pages: ConfigurablePage[] | null): void;
  disabled?: boolean;
}) {
  const selected = value ?? defaultPagesForRoles(roles);
  return (
    <fieldset disabled={disabled} className="min-w-0 rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-bold text-foreground">Page access</legend>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-muted-foreground">
          {value === null ? "Following role defaults" : "Custom pages for this account"}
          {roles.length > 0 && ` · ${roles.map((role) => roleLabel[role]).join(", ")}`}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || value === null}
          onClick={() => onChange(null)}
        >
          Use role defaults
        </Button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {["Workspace", "Spending", "Revenue", "Management"].map((group) => (
          <div key={group}>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {group}
            </div>
            <div className="space-y-2">
              {configurablePages
                .filter((page) => page.group === group)
                .map((page) => (
                  <label
                    key={page.key}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-secondary hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(page.key)}
                      className="h-4 w-4 accent-brand"
                      onChange={(event) =>
                        onChange(
                          configurablePages
                            .filter((candidate) =>
                              candidate.key === page.key
                                ? event.target.checked
                                : selected.includes(candidate.key),
                            )
                            .map((candidate) => candidate.key),
                        )
                      }
                    />
                    {page.label}
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
        Settings stays available for account and password changes. Staff &amp; access and White
        label require administrator roles. Dashboard and reports use the data available through the
        selected financial pages. All expense cases includes every expense type. Checking a page
        grants viewing access; financial actions still follow the account&apos;s transaction
        permissions.
      </p>
    </fieldset>
  );
}
