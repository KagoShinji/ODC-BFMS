"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mb-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Appearance
      </p>
      <div
        role="group"
        aria-label="Color theme"
        className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted p-1"
      >
        {(
          [
            { value: "light", label: "Light", icon: Sun },
            { value: "dark", label: "Dark", icon: Moon },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={theme === value}
            aria-label={`Use ${label.toLowerCase()} mode`}
            onClick={() => setTheme(value)}
            className={cn(
              "flex min-h-9 items-center justify-center gap-2 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              theme === value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={14} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
