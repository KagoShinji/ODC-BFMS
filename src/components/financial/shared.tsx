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
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#ee6c24]">
            {eyebrow}
          </div>
        )}
        <h2 className="text-[23px] font-bold tracking-tight text-[#20292e] sm:text-[26px]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7e8990]">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

const statusColors: Record<string, string> = {
  draft: "bg-[#eff1f3] text-[#667785]",
  submitted: "bg-[#fff2de] text-[#ac6821]",
  approved: "bg-[#e3f4eb] text-[#397758]",
  paid: "bg-[#e5edf8] text-[#426d9b]",
  rejected: "bg-[#fbe9e8] text-[#af4d46]",
  issued: "bg-[#e3f4eb] text-[#397758]",
  confirmed: "bg-[#e3f4eb] text-[#397758]",
  voided: "bg-[#fbe9e8] text-[#af4d46]",
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={statusColors[status.toLowerCase()] ?? "bg-[#e9edf1] text-[#536b7e]"}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace(/\b\w/g, (char) => char.toUpperCase())}
    </Badge>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-[#f4f5f4] text-[#91a0aa]">
        <Inbox size={22} />
      </div>
      <h3 className="text-sm font-bold text-[#253a49]">{title}</h3>
      <p className="mt-1 max-w-xs text-xs leading-5 text-[#8b969d]">{description}</p>
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
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#95a0a7]"
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
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${positive ? "text-[#2f8761]" : "text-[#bb5d40]"}`}
    >
      {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {text}
    </div>
  );
}

export const tableClass = "w-full min-w-[700px] border-collapse text-left text-sm";
export const thClass =
  "border-b border-[#edf0ee] bg-[#fafaf8] px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#8b969e]";
export const tdClass = "border-b border-[#f0f1ef] px-5 py-3.5 text-[12px] text-[#526575]";
