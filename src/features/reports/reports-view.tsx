"use client";

import { useState } from "react";
import { Download, FileBarChart2, Printer } from "lucide-react";
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
  const { data } = useFinance();
  const [selectedId, setSelectedId] = useState<ReportId>("rao");
  const reports = buildReports(data);
  const selected = reports.find((item) => item.id === selectedId)!;
  function downloadCsv() {
    if (!selected.columns.length) return;
    const lines = [selected.columns, ...selected.rows].map((row) => row.map(csvCell).join(","));
    const blob = new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selected.id}-${data.fiscalYear}-demo.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeading
        eyebrow="FINANCIAL REPORTING"
        title="Reports center"
        description="Explore working reports drawn from the demo records. Official layouts and signatories are finalized with approved forms."
      />
      <div className="grid gap-5 xl:grid-cols-[275px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Available reports</CardTitle>
            <p className="mt-1 text-xs text-[#98a2a7]">{reports.length} report types</p>
          </CardHeader>
          <CardContent className="space-y-1">
            {reports.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${selectedId === item.id ? "bg-[#fff0e4] text-[#c65c20]" : "text-[#5a6e7b] hover:bg-[#f6f7f4]"}`}
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
                className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${selected.status === "preview" ? "bg-[#fff1e4] text-[#ce6325]" : "bg-[#eef0f2] text-[#72808b]"}`}
              >
                {selected.status}
              </div>
              <CardTitle className="text-lg">{selected.title}</CardTitle>
              <p className="mt-1 text-xs text-[#91a0a7]">
                {selected.description} · FY {data.fiscalYear}
              </p>
            </div>
            <div className="no-print flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                disabled={!selected.columns.length}
              >
                <Printer size={14} /> Print
              </Button>
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
              <div className="odc-scrollbar overflow-x-auto rounded-lg border border-[#e7eae6]">
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
                  <p className="p-8 text-center text-sm text-[#8f9ba0]">
                    No records for this report yet.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#e4e8e4] bg-[#fafaf8] p-6 text-center">
                <FileBarChart2 size={27} className="text-[#b5c0c1]" />
                <div className="mt-3 text-sm font-bold text-[#334956]">Report template pending</div>
                <p className="mt-1 max-w-sm text-xs leading-5 text-[#94a0a5]">{selected.note}</p>
              </div>
            )}
            {selected.columns.length && (
              <p className="mt-4 rounded-lg bg-[#fff7ee] px-3 py-2.5 text-xs leading-5 text-[#98663e]">
                {selected.note}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
