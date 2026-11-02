"use client";

import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Info,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type { AuditEvent } from "@/domain/types";
import { useFinance } from "@/data/demo/finance-provider";
import { PdfButton } from "@/components/financial/pdf-button";
import { auditDocument } from "@/features/reports/financial-documents";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeading } from "@/components/financial/shared";
import {
  auditActorKey,
  auditDate,
  filterAudit,
  groupAuditByDate,
  type AuditFilters,
} from "@/lib/audit";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/ui/table-pagination";

const emptyFilters: AuditFilters = {
  query: "",
  action: "",
  account: "",
  from: "",
  to: "",
  order: "newest",
};
const selectClass =
  "h-10 w-full min-w-0 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

function eventStyle(action: string) {
  if (/reject|void|deactivat|remov|revok/i.test(action))
    return { Icon: XCircle, classes: "bg-danger-soft text-danger" };
  if (/approv|paid|payment|confirm|settled/i.test(action))
    return { Icon: CheckCircle2, classes: "bg-success-soft text-success" };
  if (/staff|access|role|branding|password/i.test(action))
    return { Icon: ShieldCheck, classes: "bg-violet-soft text-violet" };
  return { Icon: FileText, classes: "bg-info-soft text-info" };
}

function AuditEntry({ event }: { event: AuditEvent }) {
  const { Icon, classes } = eventStyle(event.action);
  const date = auditDate(event.at);
  const summary = event.detail.length > 150 ? `${event.detail.slice(0, 147)}…` : event.detail;
  return (
    <li className="border-b border-border px-4 py-4 last:border-0 sm:px-6">
      <div className="flex gap-3 sm:gap-4">
        <span
          aria-hidden="true"
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${classes}`}
        >
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-foreground">{event.action}</p>
              <p className="mt-0.5 break-words text-xs text-muted-foreground">{event.subject}</p>
            </div>
            <time
              dateTime={Number.isFinite(new Date(event.at).getTime()) ? event.at : undefined}
              title={`${date.full} (Asia/Manila)`}
              className="whitespace-nowrap text-xs text-muted-foreground"
            >
              {date.time}
            </time>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="inline-flex max-w-full items-center gap-1.5 font-medium text-secondary">
              <UserRound aria-hidden="true" size={13} className="shrink-0" />
              <span className="break-all">
                <span className="sr-only">Performed by: </span>
                {event.actor}
              </span>
            </span>
            {event.actorEmail && event.actorEmail !== event.actor && (
              <span className="break-all text-muted-foreground">{event.actorEmail}</span>
            )}
            {!event.actorEmail && !event.actorId && (
              <Badge className="bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                Account unavailable
              </Badge>
            )}
          </div>
          {summary && (
            <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">{summary}</p>
          )}
          <details className="group mt-2">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded py-1 text-[11px] font-semibold text-brand-ink outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
              <ChevronDown
                aria-hidden="true"
                size={13}
                className="transition-transform group-open:rotate-180"
              />
              Event details
              <span className="sr-only">
                {" "}
                for {event.action}, {date.full}
              </span>
            </summary>
            <dl className="mt-2 grid gap-3 rounded-xl border border-border bg-muted/50 p-4 text-xs sm:grid-cols-2">
              {[
                ["Performed by", event.actor],
                ["Account email", event.actorEmail || "Not recorded for this event"],
                ["Account ID", event.actorId || "Not recorded for this event"],
                ["Event ID", event.id],
                ["Record", event.subject],
                ["When (Asia/Manila)", date.full],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 select-text break-all text-secondary">{value}</dd>
                </div>
              ))}
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Recorded details
                </dt>
                <dd className="mt-1 select-text whitespace-pre-wrap break-words leading-5 text-secondary">
                  {event.detail || "No additional details recorded."}
                </dd>
              </div>
            </dl>
          </details>
        </div>
      </div>
    </li>
  );
}

export function AuditView({ notice }: { notice: string }) {
  const { data, preview, loaded, exportError } = useFinance();
  const [filters, setFilters] = useState<AuditFilters>(emptyFilters);
  const change = <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const events = filterAudit(data.audit, filters);
  const pagination = usePagination(events, JSON.stringify([filters, data.barangay]));
  const groups = groupAuditByDate(pagination.items);
  const actions = [...new Set(data.audit.map((event) => event.action))].sort((a, b) =>
    a.localeCompare(b, "en"),
  );
  const accounts = [
    ...new Map(
      filterAudit(data.audit, emptyFilters)
        .reverse()
        .map((event) => [auditActorKey(event), event]),
    ).entries(),
  ].sort((a, b) => a[1].actor.localeCompare(b[1].actor, "en"));
  const identifiedAccounts = new Set(
    events.filter((event) => event.actorId || event.actorEmail).map(auditActorKey),
  ).size;
  const latest = filterAudit(events, { ...emptyFilters })[0];
  const active = Boolean(
    filters.query || filters.action || filters.account || filters.from || filters.to,
  );
  const invalidDates = Boolean(filters.from && filters.to && filters.from > filters.to);
  const reset = () => setFilters(emptyFilters);
  return (
    <>
      <PageHeading
        eyebrow="ACCOUNTABILITY"
        title="Activity & audit trail"
        description={`See who changed what in ${data.barangay}. All times are shown in Asia/Manila.`}
        action={
          <PdfButton
            documents={[auditDocument(events)]}
            disabled={!events.length || invalidDates}
            label="Export filtered log"
          />
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Matching events",
            value: events.length.toLocaleString("en-US"),
            hint: `${data.audit.length} events loaded`,
            Icon: Activity,
          },
          {
            label: "Accounts identified",
            value: String(identifiedAccounts),
            hint: "Within the current results",
            Icon: Users,
          },
          {
            label: "Latest matching event",
            value: latest ? auditDate(latest.at).time : "—",
            hint: latest ? auditDate(latest.at).day : "No matching activity",
            Icon: Clock3,
          },
        ].map(({ label, value, hint, Icon }) => (
          <Card
            key={label}
            className={label === "Latest matching event" ? "hidden sm:block" : undefined}
          >
            <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
              </div>
              <Icon aria-hidden="true" size={18} className="mt-1 hidden text-brand-ink sm:block" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="space-y-4 border-b border-border p-4 sm:p-6">
          <div className="grid grid-cols-2 items-end gap-3 xl:grid-cols-[minmax(260px,2fr)_1fr_1fr]">
            <label className="col-span-2 block min-w-0 text-xs font-semibold text-secondary xl:col-span-1">
              <span>Search activity</span>
              <span className="relative mt-1.5 block">
                <Search
                  aria-hidden="true"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  value={filters.query}
                  onChange={(event) => change("query", event.target.value)}
                  placeholder="Name, email, record or action…"
                  className="pl-9"
                />
              </span>
            </label>
            <label className="block min-w-0 text-xs font-semibold text-secondary">
              Action
              <select
                value={filters.action}
                onChange={(event) => change("action", event.target.value)}
                className={`mt-1.5 ${selectClass}`}
              >
                <option value="">All actions</option>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 text-xs font-semibold text-secondary">
              Account
              <select
                value={filters.account}
                onChange={(event) => change("account", event.target.value)}
                className={`mt-1.5 ${selectClass}`}
              >
                <option value="">All accounts</option>
                {accounts.map(([key, event]) => (
                  <option key={key} value={key}>
                    {event.actor}
                    {event.actorEmail && event.actorEmail !== event.actor
                      ? ` · ${event.actorEmail}`
                      : key.startsWith("unidentified:")
                        ? " · Account unavailable"
                        : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 text-xs font-semibold text-secondary sm:max-w-[170px]">
              From date
              <Input
                className="mt-1.5 min-w-0"
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                aria-invalid={invalidDates || undefined}
                aria-describedby={invalidDates ? "audit-date-error" : undefined}
                onChange={(event) => change("from", event.target.value)}
              />
            </label>
            <label className="min-w-0 flex-1 text-xs font-semibold text-secondary sm:max-w-[170px]">
              To date
              <Input
                className="mt-1.5 min-w-0"
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                aria-invalid={invalidDates || undefined}
                aria-describedby={invalidDates ? "audit-date-error" : undefined}
                onChange={(event) => change("to", event.target.value)}
              />
            </label>
            <label className="w-full min-w-0 text-xs font-semibold text-secondary sm:w-[170px]">
              Sort
              <select
                className={`mt-1.5 ${selectClass}`}
                value={filters.order}
                onChange={(event) => change("order", event.target.value as AuditFilters["order"])}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            {active && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <X size={14} />
                Clear filters
              </Button>
            )}
          </div>
          {invalidDates && (
            <p id="audit-date-error" role="alert" className="text-xs text-danger">
              From date must be on or before To date.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <p role="status" aria-live="polite">
              {events.length} matching {events.length === 1 ? "event" : "events"}
              {active ? ` of ${data.audit.length} loaded` : ""}
            </p>
            <span className="inline-flex items-center gap-2">
              <Badge
                className={
                  preview ? "bg-success-soft text-success" : "bg-brand-soft text-brand-ink"
                }
              >
                {preview ? "Live records" : "Demo records"}
              </Badge>
              Asia/Manila
            </span>
          </div>
        </div>
        {!loaded ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground" role="status">
            Loading activity…
          </div>
        ) : exportError ? (
          <div className="p-6 text-sm text-danger" role="alert">
            {exportError} Reload this page before reviewing or exporting the log.
          </div>
        ) : events.length ? (
          <div aria-label="Audit events">
            {groups.map((group) => (
              <section key={group.key || "unknown-date"} aria-label={group.label}>
                <div className="border-y border-border bg-muted/60 px-4 py-2 text-[11px] font-semibold text-secondary sm:px-6">
                  {group.label}
                </div>
                <ul className="m-0 list-none p-0">
                  {group.events.map((event) => (
                    <AuditEntry key={event.id} event={event} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Search aria-hidden="true" size={25} className="text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              {active ? "No events match these filters" : "No activity recorded yet"}
            </h3>
            <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
              {active
                ? "Try another account, action or date range. You can also clear all filters."
                : "Actions recorded for this barangay will appear here with the account that performed them."}
            </p>
            {active && (
              <Button className="mt-4" size="sm" variant="outline" onClick={reset}>
                Clear filters
              </Button>
            )}
          </div>
        )}
        <TablePagination pagination={pagination} label="Audit trail" />
      </Card>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <Info aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
        <span>{notice} Exports include all matching loaded events, across every page.</span>
      </p>
    </>
  );
}
