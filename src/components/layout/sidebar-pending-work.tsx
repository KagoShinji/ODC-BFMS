"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, CheckCheck, FileClock, ReceiptText, Wallet } from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import { usePageAccess } from "./page-access-provider";
import { canAccessPath } from "@/lib/auth/page-access";
import { workspaceNotifications } from "@/lib/notifications";

const workTypes = [
  { kind: "review", label: "For review", icon: FileClock },
  { kind: "payment", label: "For payment", icon: Wallet },
  { kind: "collection", label: "Unmatched receipts", icon: ReceiptText },
  { kind: "advance", label: "Open advances", icon: BookOpen },
] as const;

export function SidebarPendingWork({ close }: { close?: () => void }) {
  const { data, loaded, exportError } = useFinance();
  const { pages } = usePageAccess();
  const items = useMemo(() => {
    const visible = workspaceNotifications(data).filter(
      (item) => item.kind !== "activity" && canAccessPath(pages, item.href),
    );
    return workTypes.flatMap((type) => {
      const records = visible.filter((item) => item.kind === type.kind);
      return records.length ? [{ ...type, count: records.length, href: records[0].href }] : [];
    });
  }, [data, pages]);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section
      aria-label="Pending work"
      className="rounded-2xl bg-card p-3 shadow-[0_1px_8px_rgba(24,35,40,.035)]"
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-[11px] font-bold text-foreground">Pending work</h2>
        {loaded && !exportError && total > 0 && (
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-ink">
            {total} {total === 1 ? "item" : "items"}
          </span>
        )}
      </div>
      {!loaded ? (
        <p role="status" className="mt-2 px-1 text-[10px] leading-4 text-muted-foreground">
          Loading pending work…
        </p>
      ) : exportError ? (
        <p className="mt-2 px-1 text-[10px] leading-4 text-muted-foreground">
          Pending work is unavailable. Check the selected barangay and refresh the page.
        </p>
      ) : total ? (
        <>
          <ul className="mt-2 space-y-0.5">
            {items.map(({ kind, label, icon: Icon, count, href }) => (
              <li key={kind}>
                <Link
                  href={href}
                  onClick={close}
                  className="flex min-h-8 items-center gap-2 rounded-lg px-1 text-[11px] text-secondary transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <Icon size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  <span className="font-bold tabular-nums text-foreground">{count}</span>
                  <ArrowUpRight size={12} className="text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 px-1 text-[10px] leading-4 text-muted-foreground">
            From the records you can view.
          </p>
        </>
      ) : (
        <div className="mt-2 flex items-start gap-2 px-1 text-[10px] leading-4 text-muted-foreground">
          <CheckCheck size={14} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          <p>No pending items in the records you can view.</p>
        </div>
      )}
    </section>
  );
}
