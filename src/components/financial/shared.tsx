import { ArrowDownRight, ArrowUpRight, Inbox, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 px-1 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-brand-ink">
            {eyebrow}
          </div>
        )}
        <h2 className="text-[23px] font-bold tracking-tight text-foreground sm:text-[26px]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{action}</div>
      )}
    </div>
  );
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  paid: "bg-info-soft text-info",
  rejected: "bg-danger-soft text-danger",
  issued: "bg-success-soft text-success",
  confirmed: "bg-success-soft text-success",
  voided: "bg-danger-soft text-danger",
  active: "bg-success-soft text-success",
  inactive: "bg-muted text-muted-foreground",
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={statusColors[status.toLowerCase()] ?? "bg-muted text-muted-foreground"}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace(/\b\w/g, (char) => char.toUpperCase())}
    </Badge>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Inbox size={22} />
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search records...",
}: {
  value: string;
  onChange(value: string): void;
  placeholder?: string;
}) {
  return (
    <div className="relative max-w-sm">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}

export function Trend({ positive = true, text }: { positive?: boolean; text: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${positive ? "text-success" : "text-danger"}`}
    >
      {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {text}
    </div>
  );
}

export const tableClass = "w-full min-w-[700px] border-collapse text-left text-sm";
export const thClass =
  "border-b border-border bg-muted px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground";
export const tdClass = "border-b border-border px-5 py-3.5 text-[12px] text-secondary";
