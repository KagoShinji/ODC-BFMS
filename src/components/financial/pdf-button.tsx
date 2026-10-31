"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/components/layout/brand";
import { useFeedback } from "@/components/layout/feedback-context";
import { useFinance } from "@/data/demo/finance-provider";
import { printDocuments, type PrintDocument } from "@/lib/print-document";

export function PdfButton({
  documents,
  label = "Print / Save PDF",
  disabled = false,
}: {
  documents: PrintDocument[];
  label?: string;
  disabled?: boolean;
}) {
  const { data, preview, loaded, exportError } = useFinance();
  const branding = useBranding();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);
  async function exportPdf() {
    if (busy || !loaded || exportError) return;
    setBusy(true);
    try {
      await printDocuments(documents, {
        barangay: data.barangay,
        fiscalYear: data.fiscalYear,
        branding,
        demo: !preview,
        generatedAt: new Date(),
      });
    } catch (error) {
      feedback.error({
        title: "Unable to prepare PDF",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="no-print"
      onClick={exportPdf}
      disabled={disabled || !loaded || Boolean(exportError) || !documents.length}
      loading={busy}
      loadingText="Preparing PDF…"
      title={exportError || "Choose Save as PDF in the print dialog."}
    >
      <Printer size={14} /> {label}
    </Button>
  );
}
