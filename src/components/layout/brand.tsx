"use client";

import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { defaultBranding, type Branding } from "@/lib/branding";

const BrandingContext = createContext<Branding>(defaultBranding);

export function BrandingProvider({ value, children }: { value: Branding; children: ReactNode }) {
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}

/** Logo image when one is set, otherwise the short text mark. */
export function BrandMark({ large = false, branding }: { large?: boolean; branding?: Branding }) {
  const current = useBranding();
  const { logoUrl, markText } = branding ?? current;
  if (logoUrl)
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn("odc-mark odc-mark--image", large && "odc-mark--large")}
      />
    );
  return (
    <div className={cn("odc-mark", large && "odc-mark--large")} aria-hidden="true">
      {markText}
    </div>
  );
}

export function BrandLockup({
  large = false,
  tone = "light",
  branding,
}: {
  large?: boolean;
  tone?: "light" | "dark";
  branding?: Branding;
}) {
  const current = useBranding();
  const value = branding ?? current;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BrandMark large={large} branding={value} />
      <div className="min-w-0">
        <div
          className={cn(
            "line-clamp-2 leading-tight",
            large ? "max-w-[210px] text-sm font-extrabold" : "text-[13px] font-bold",
            tone === "dark" ? "text-white" : "text-foreground",
          )}
        >
          {value.appName}
        </div>
        {value.organizationName && (
          <div
            className={cn(
              "truncate font-bold",
              large ? "mt-1 text-xs" : "mt-0.5 text-[11px]",
              tone === "dark" ? "text-brand-light" : "text-brand-ink",
            )}
          >
            by {value.organizationName}
          </div>
        )}
      </div>
    </div>
  );
}
