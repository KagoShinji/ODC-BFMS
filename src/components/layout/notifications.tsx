"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  BookOpen,
  CheckCheck,
  FileClock,
  ReceiptText,
  RefreshCcw,
  Wallet,
  X,
} from "lucide-react";
import { useFinance } from "@/data/demo/finance-provider";
import {
  notificationReadIds,
  workspaceNotifications,
  type WorkspaceNotification,
} from "@/lib/notifications";
import { cn, displayDate, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const icons = {
  review: FileClock,
  payment: Wallet,
  collection: ReceiptText,
  advance: BookOpen,
  activity: Activity,
};

export function Notifications({
  scope,
  liveRefresh = false,
}: {
  scope: string;
  liveRefresh?: boolean;
}) {
  const { data, loaded } = useFinance();
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const notifications = useMemo(() => workspaceNotifications(data), [data]);
  const storageKey = `odc-notifications:${scope}`;
  const [open, setOpen] = useState(false);
  const [readState, setReadState] = useState<{ key: string; ids: string[] }>({ key: "", ids: [] });
  const [toast, setToast] = useState<WorkspaceNotification | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const observed = useRef<{ key: string; ids: Set<string> } | null>(null);
  const lastRefresh = useRef(0);
  const ready = loaded && readState.key === storageKey;
  const readIds = useMemo(
    () => new Set(readState.key === storageKey ? readState.ids : []),
    [readState, storageKey],
  );
  const unread = ready ? notifications.filter((item) => !readIds.has(item.id)) : [];

  useEffect(() => {
    const read = () => {
      let ids: string[] = [];
      try {
        ids = notificationReadIds(localStorage.getItem(storageKey));
      } catch {
        /* Private browsing can disable storage. */
      }
      setReadState({ key: storageKey, ids });
    };
    read();
    setToast(null);
    setAnnouncement("");
    setOpen(false);
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) read();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    const previous = observed.current;
    if (previous?.key === storageKey) {
      const fresh = notifications.filter(
        (item) => !previous.ids.has(item.id) && !readIds.has(item.id),
      );
      if (fresh.length) {
        setToast(fresh[0]);
        setAnnouncement(
          `${fresh.length} new notification${fresh.length === 1 ? "" : "s"}. ${fresh[0].title}.`,
        );
      }
    }
    observed.current = { key: storageKey, ids: new Set(notifications.map((item) => item.id)) };
  }, [notifications, ready, readIds, storageKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!liveRefresh) return;
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh.current < 5000) return;
      lastRefresh.current = Date.now();
      router.refresh();
    };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [liveRefresh, router]);

  function markRead(ids: string[]) {
    const next = [...new Set([...readIds, ...ids])].slice(-2000);
    setReadState({ key: storageKey, ids: next });
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Keep read state for this session. */
    }
  }

  function openNotification(item: WorkspaceNotification) {
    markRead([item.id]);
    setOpen(false);
    setToast(null);
  }

  return (
    <>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`}
            title="Notifications"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-secondary transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:h-11 sm:w-11"
          >
            <Bell size={18} aria-hidden="true" />
            {unread.length > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-brand-foreground"
                aria-hidden="true"
              >
                {unread.length > 99 ? "99+" : unread.length}
              </span>
            )}
          </button>
        </DialogTrigger>
        <DialogContent className="flex max-h-[min(760px,90dvh)] w-[calc(100%-24px)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 text-foreground">
          <DialogHeader className="shrink-0 px-5 pb-4 pt-5 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Bell size={19} className="text-brand-ink" /> Notifications
            </DialogTitle>
            <DialogDescription className="pt-1 text-xs">
              {unread.length ? `${unread.length} unread · ` : ""}Updates and pending work for{" "}
              {data.barangay}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex shrink-0 items-center justify-between gap-2 border-y border-border px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={!unread.length}
              onClick={() => markRead(notifications.map((item) => item.id))}
            >
              <CheckCheck size={14} /> Mark all read
            </Button>
            {liveRefresh && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                loading={refreshing}
                loadingText="Refreshing…"
                onClick={() => startRefresh(() => router.refresh())}
              >
                <RefreshCcw size={13} /> Refresh
              </Button>
            )}
          </div>
          <div className="odc-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {notifications.length ? (
              <ul className="space-y-1">
                {notifications.map((item) => {
                  const Icon = icons[item.kind];
                  const isUnread = ready && !readIds.has(item.id);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => openNotification(item)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                          isUnread && "bg-brand-soft/50",
                        )}
                      >
                        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-brand-ink">
                          <Icon size={17} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3 text-xs font-semibold text-foreground">
                            {item.title}
                            {isUnread && (
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand">
                                <span className="sr-only">Unread</span>
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block break-words text-[11px] leading-5 text-secondary">
                            {item.detail}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                            {displayDate(item.date.slice(0, 10))}
                            {item.amount !== undefined && (
                              <span className="font-medium text-secondary">
                                {formatMoney(item.amount)}
                              </span>
                            )}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-6 py-12 text-center">
                <CheckCheck size={28} className="mx-auto text-success" />
                <p className="mt-3 text-sm font-semibold">You’re all caught up</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  New activity and pending items will appear here.
                </p>
              </div>
            )}
          </div>
          <p className="shrink-0 border-t border-border px-5 py-3 text-[10px] leading-5 text-muted-foreground">
            {liveRefresh
              ? "Checks for updates every minute while this workspace is open."
              : "Updates as you work in this workspace."}{" "}
            Read status is saved in this browser.
          </p>
        </DialogContent>
      </Dialog>
      {toast && !open && (
        <div className="fixed bottom-5 right-4 z-40 flex w-[calc(100%-32px)] max-w-sm items-start gap-3 rounded-2xl border border-border bg-card p-4 text-foreground shadow-xl sm:right-6">
          <Bell size={18} className="mt-0.5 shrink-0 text-brand-ink" aria-hidden="true" />
          <Link
            href={toast.href}
            onClick={() => openNotification(toast)}
            className="min-w-0 flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span className="block text-xs font-semibold">{toast.title}</span>
            <span className="mt-1 block truncate text-[11px] text-muted-foreground">
              {toast.detail}
            </span>
          </Link>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
            className="rounded p-1 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
