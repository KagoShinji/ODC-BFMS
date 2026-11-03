"use client";

import { useState } from "react";
import { Download, FileBarChart2, HelpCircle, Info, Search } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/ui/table-pagination";
import { PdfButton } from "@/components/financial/pdf-button";
import { useFinance } from "@/data/demo/finance-provider";
import { buildReports, type ReportDefinition, type ReportId } from "./report-data";
import { reportGroups, reportHelp } from "./report-help";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeading, tableClass, tdClass, thClass } from "@/components/financial/shared";

function csvCell(value: string) {
  const safe = /^[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

function ReportStatus({ report }: { report: ReportDefinition }) {
  const pending = report.status === "template pending";
  return (
    <span
      className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${pending ? "bg-muted text-muted-foreground" : report.id === "reai" ? "bg-warning-soft text-warning" : "bg-brand-soft text-brand-ink"}`}
    >
      {pending ? "Needs setup" : report.id === "reai" ? "Partial preview" : "Working preview"}
    </span>
  );
}

function ReportHelpButton({
  report,
  expanded = false,
}: {
  report: ReportDefinition;
  expanded?: boolean;
}) {
  const help = reportHelp[report.id];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={expanded ? "sm" : "icon"}
          className={expanded ? "shrink-0" : "h-9 w-9 shrink-0 rounded-full"}
          aria-label={`About ${report.title}`}
          title={`About ${report.title}`}
        >
          <HelpCircle size={17} aria-hidden="true" />
          {expanded && "About this report"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="pr-5 text-left">
          <DialogTitle>{report.title}</DialogTitle>
          <DialogDescription className="pt-2 leading-6">{help.meaning}</DialogDescription>
        </DialogHeader>
        <ReportStatus report={report} />
        <dl className="space-y-4 text-sm">
          {[
            ["When to use it", help.useWhen],
            ["Where the figures come from", help.source],
            ["What to check", help.limitation],
          ].map(([label, text]) => (
            <div key={label}>
              <dt className="font-semibold">{label}</dt>
              <dd className="mt-1 leading-6 text-muted-foreground">{text}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

export function ReportsView() {
  const { data, preview, loaded, exportError } = useFinance();
  const [selectedId, setSelectedId] = useState<ReportId>("rao");
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const reports = buildReports(data, !preview);
  const exportable = reports.filter((item) => item.columns.length);
  const selected = reports.find((item) => item.id === selectedId)!;
  const help = reportHelp[selected.id];
  const visible = reports.filter((item) => {
    const matches =
      `${item.title} ${item.description} ${reportHelp[item.id].meaning} ${reportHelp[item.id].group}`
        .toLowerCase()
        .includes(query.trim().toLowerCase());
    return (
      matches &&
      (availability === "all" ||
        (availability === "preview" ? !!item.columns.length : !item.columns.length))
    );
  });
  const canExport = loaded && !exportError && !!selected.columns.length && !!selected.rows.length;
  const pagination = usePagination(
    selected.rows,
    JSON.stringify([data.barangay, data.fiscalYear, selectedId]),
  );
  function downloadCsv() {
    if (!canExport) return;
    const lines = [selected.columns, ...selected.rows].map((row) => row.map(csvCell).join(","));
    const blob = new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selected.id}-${data.fiscalYear}-${preview ? "live" : "demo"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeading
        eyebrow="FINANCIAL REPORTING"
        title="Reports center"
        description="Choose a report to review your budget, payments and collections. Use the question marks to learn what each report means."
        action={
          <PdfButton
            documents={exportable}
            disabled={!loaded || !!exportError}
            label={`Export ${exportable.length} previews`}
          />
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{reports.length}</strong> report types
        </span>
        <span>
          <strong className="text-brand-ink">{exportable.length}</strong> previews
        </span>
        <span>
          <strong className="text-foreground">{reports.length - exportable.length}</strong> need
          setup
        </span>
        <span className="sm:ml-auto">
          {data.barangay} · FY {data.fiscalYear} · {preview ? "Live records" : "Demo records"}
        </span>
      </div>
      <p className="mb-5 text-xs leading-5 text-muted-foreground">
        Budget reports use FY {data.fiscalYear} budget lines. Transaction reports include all loaded
        dates, including older payments and settlements.
      </p>
      <div className="grid items-start gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader className="gap-3">
            <div>
              <CardTitle>Find a report</CardTitle>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Select a report to view it. The ? button opens its guide.
              </p>
            </div>
            <label className="relative block">
              <span className="sr-only">Search reports</span>
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or purpose…"
                className="pl-9"
              />
            </label>
            <label className="text-xs font-semibold text-secondary">
              Availability
              <select
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm font-normal"
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
              >
                <option value="all">All report types ({reports.length})</option>
                <option value="preview">Previews ({exportable.length})</option>
                <option value="pending">Needs setup ({reports.length - exportable.length})</option>
              </select>
            </label>
          </CardHeader>
          <CardContent>
            <nav
              aria-label="Report catalog"
              className="max-h-[360px] space-y-5 overflow-y-auto xl:max-h-none"
            >
              {reportGroups.map((group) => {
                const items = visible.filter((item) => reportHelp[item.id].group === group);
                return items.length ? (
                  <section key={group} aria-label={group}>
                    <h3 className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </h3>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-1 rounded-xl border pr-1 ${selectedId === item.id ? "border-brand/30 bg-brand-soft" : "border-transparent hover:bg-muted"}`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedId(item.id)}
                            aria-current={selectedId === item.id ? "true" : undefined}
                            aria-controls="report-panel"
                            className="min-w-0 flex-1 rounded-xl px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          >
                            <span
                              className={`mb-1.5 block text-xs font-bold ${selectedId === item.id ? "text-brand-ink" : "text-foreground"}`}
                            >
                              {item.title}
                            </span>
                            <ReportStatus report={item} />
                          </button>
                          <ReportHelpButton report={item} />
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null;
              })}
              {!visible.length && (
                <div className="px-2 py-4 text-sm text-muted-foreground">
                  <p role="status">No reports match your search.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setQuery("");
                      setAvailability("all");
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </nav>
          </CardContent>
        </Card>
        <Card id="report-panel" role="region" aria-labelledby="report-title" className="min-w-0">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ReportStatus report={selected} />
              <ReportHelpButton report={selected} expanded />
            </div>
            <div aria-live="polite" aria-atomic="true">
              <CardTitle id="report-title" className="text-xl leading-snug">
                {selected.title}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {help.meaning}
              </p>
            </div>
            <div className="rounded-xl bg-muted px-4 py-3 text-xs leading-5 text-secondary">
              <span className="font-semibold text-foreground">Use this to: </span>
              {help.useWhen}
            </div>
            {selected.columns.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  {loaded
                    ? `${selected.rows.length} ${selected.rows.length === 1 ? "row" : "rows"}`
                    : "Loading records…"}{" "}
                  · Exports include all pages
                </p>
                <div className="no-print flex flex-wrap gap-2">
                  <PdfButton
                    documents={[selected]}
                    disabled={!canExport}
                    label="Print / Save PDF"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadCsv}
                    disabled={!canExport}
                  >
                    <Download size={14} aria-hidden="true" /> Export CSV
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selected.columns.length ? (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted p-6 text-center">
                <FileBarChart2 size={28} className="text-muted-foreground" aria-hidden="true" />
                <h4 className="mt-3 text-sm font-bold">This report needs setup</h4>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {help.limitation}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Preview and export will be available once setup is complete.
                </p>
              </div>
            ) : !loaded ? (
              <p role="status" className="py-12 text-center text-sm text-muted-foreground">
                Loading report records…
              </p>
            ) : exportError ? (
              <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">
                {exportError} Reload this page before reviewing or exporting reports.
              </p>
            ) : !selected.rows.length ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <FileBarChart2
                  size={25}
                  className="mx-auto text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold">No records for this report yet</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{help.source}</p>
              </div>
            ) : (
              <>
                <div
                  className="odc-scrollbar overflow-x-auto rounded-xl border border-border"
                  role="region"
                  aria-label={`${selected.title} table`}
                  tabIndex={0}
                >
                  <table className={tableClass}>
                    <caption className="sr-only">
                      {selected.title} for {data.barangay}. Page {pagination.page}.
                    </caption>
                    <thead>
                      <tr>
                        {selected.columns.map((column) => (
                          <th key={column} scope="col" className={thClass}>
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.items.map((row, index) => (
                        <tr key={index} className="hover:bg-accent">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className={tdClass}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination pagination={pagination} label="Report rows" />
              </>
            )}
            {!!selected.columns.length && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-soft px-4 py-3 text-xs leading-5 text-secondary">
                <Info size={15} className="mt-0.5 shrink-0 text-brand-ink" aria-hidden="true" />
                <p>{help.limitation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
