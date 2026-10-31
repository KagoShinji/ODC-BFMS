"use client";

import { useState } from "react";
import { Download, FileBarChart2 } from "lucide-react";
import { PdfButton } from "@/components/financial/pdf-button";
import { useFinance } from "@/data/demo/finance-provider";
import { buildReports, type ReportId } from "./report-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeading, tableClass, tdClass, thClass } from "@/components/financial/shared";

function csvCell(value: string) {
  const safe = /^[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function ReportsView() {
  const { data, preview } = useFinance();
  const [selectedId, setSelectedId] = useState<ReportId>("rao");
  const reports = buildReports(data, !preview);
  const selected = reports.find((item) => item.id === selectedId)!;
  function downloadCsv() {
    if (!selected.columns.length) return;
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
        description={`Explore working reports drawn from ${preview ? "live" : "demo"} records. Official layouts and signatories are finalized with approved forms.`}
        action={
          <PdfButton
            documents={reports.filter((item) => item.columns.length)}
            label="Print / Save all reports"
          />
        }
      />
      <div className="grid gap-5 xl:grid-cols-[275px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Available reports</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{reports.length} report types</p>
          </CardHeader>
          <CardContent className="space-y-1">
            {reports.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${selectedId === item.id ? "bg-brand-soft text-brand-ink" : "text-secondary hover:bg-muted"}`}
              >
                <FileBarChart2 size={17} className="shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold">{item.title}</div>
                  <div className="truncate text-[10px] opacity-70">{item.description}</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <div
                className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${selected.status === "preview" ? "bg-brand-soft text-brand-ink" : "bg-muted text-muted-foreground"}`}
              >
                {selected.status}
              </div>
              <CardTitle className="text-lg">{selected.title}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected.description} · FY {data.fiscalYear}
              </p>
            </div>
            <div className="no-print flex gap-2">
              <PdfButton documents={[selected]} disabled={!selected.columns.length} />
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCsv}
                disabled={!selected.columns.length}
              >
                <Download size={14} /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selected.columns.length ? (
              <div className="odc-scrollbar overflow-x-auto rounded-lg border border-border">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      {selected.columns.map((column) => (
                        <th key={column} className={thClass}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.rows.map((row, index) => (
                      <tr key={index}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className={tdClass}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!selected.rows.length && (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    No records for this report yet.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted p-6 text-center">
                <FileBarChart2 size={27} className="text-muted-foreground" />
                <div className="mt-3 text-sm font-bold text-secondary">Report template pending</div>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  {selected.note}
                </p>
              </div>
            )}
            {selected.columns.length && (
              <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2.5 text-xs leading-5 text-warning">
                {selected.note}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
