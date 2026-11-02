import type { AuditEvent } from "../domain/types";

export interface AuditRow {
  id: string;
  actor_id: string;
  actor_name?: string | null;
  actor_email?: string | null;
  action: string;
  subject_type: string;
  detail?: Record<string, unknown> | null;
  created_at: string;
}
const humanize = (value: string) => value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function auditEventFromRow(row: AuditRow): AuditEvent {
  const name = row.actor_name?.trim();
  const email = row.actor_email?.trim();
  return {
    id: row.id,
    action: humanize(row.action),
    subject: humanize(row.subject_type),
    detail: Object.entries(row.detail || {})
      .map(([key, value]) => `${humanize(key)}: ${String(value)}`)
      .join(" · "),
    at: row.created_at,
    actor: name || email || `Account ${row.actor_id}`,
    actorEmail: email || undefined,
    actorId: row.actor_id,
  };
}

export function auditMatches(event: AuditEvent, query: string) {
  return [event.actor, event.actorEmail, event.actorId, event.action, event.subject, event.detail]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query.trim().toLowerCase());
}

const manilaClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  calendar: "iso8601",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Numeric parts keep server/browser locale punctuation out of hydrated labels. */
export function auditDate(at: string) {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime()))
    return { key: "", day: "Date unavailable", time: "Time unavailable", full: "Date unavailable" };
  const parts = Object.fromEntries(
    manilaClock.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const day = `${Number(parts.day)} ${months[Number(parts.month) - 1]} ${parts.year}`;
  const hour = Number(parts.hour);
  const time = `${hour % 12 || 12}:${parts.minute} ${hour >= 12 ? "PM" : "AM"}`;
  return { key: `${parts.year}-${parts.month}-${parts.day}`, day, time, full: `${day}, ${time}` };
}

export function auditActorKey(event: AuditEvent) {
  return event.actorId
    ? `id:${event.actorId}`
    : event.actorEmail
      ? `email:${event.actorEmail.toLowerCase()}`
      : `unidentified:${event.actor}`;
}

export interface AuditFilters {
  query: string;
  action: string;
  account: string;
  from: string;
  to: string;
  order: "newest" | "oldest";
}
export function filterAudit(events: readonly AuditEvent[], filters: AuditFilters) {
  if (filters.from && filters.to && filters.from > filters.to) return [];
  return events
    .filter((event) => {
      const day = auditDate(event.at).key;
      return (
        auditMatches(event, filters.query) &&
        (!filters.action || event.action === filters.action) &&
        (!filters.account || auditActorKey(event) === filters.account) &&
        (!filters.from || (day !== "" && day >= filters.from)) &&
        (!filters.to || (day !== "" && day <= filters.to))
      );
    })
    .sort((a, b) => {
      const left = new Date(a.at).getTime(),
        right = new Date(b.at).getTime();
      if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : a.id.localeCompare(b.id);
      if (!Number.isFinite(right)) return -1;
      return (filters.order === "newest" ? right - left : left - right) || a.id.localeCompare(b.id);
    });
}

export function groupAuditByDate(events: readonly AuditEvent[]) {
  const groups: { key: string; label: string; events: AuditEvent[] }[] = [];
  for (const event of events) {
    const date = auditDate(event.at);
    let group = groups[groups.length - 1];
    if (!group || group.key !== date.key) {
      group = { key: date.key, label: date.day, events: [] };
      groups.push(group);
    }
    group.events.push(event);
  }
  return groups;
}
