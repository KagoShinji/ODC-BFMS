"use client";

import { ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ExpenseStep } from "@/domain/types";

// Names follow the document path defined in docs/process-flow.md.
const stages: {
  label: ExpenseStep;
  name: string;
  meaning: string;
  action: string;
}[] = [
  {
    label: "PR",
    name: "Purchase Request",
    meaning: "Records what needs to be purchased, why it is needed and the requested amount.",
    action:
      "Check the request details, purpose and budget line. When the supporting request is ready, use Complete PR to move the case to RFQ.",
  },
  {
    label: "RFQ",
    name: "Request for Quotation",
    meaning: "Requests supplier prices and terms for the items or services being purchased.",
    action:
      "Keep the supplier quotations and required review records with the case. When this stage is ready, use Complete RFQ to move to PO.",
  },
  {
    label: "PO",
    name: "Purchase Order",
    meaning:
      "Documents the order placed with the supplier, including the agreed items, quantities and prices. In this path, PO means Purchase Order; the staff role Procurement officer also uses the abbreviation PO.",
    action:
      "Check the supplier, purchase details and supporting approvals. Use Complete PO when the order stage is ready to move to AIR.",
  },
  {
    label: "AIR",
    name: "Acceptance and Inspection Report",
    meaning:
      "Records the inspection and acceptance of delivered goods against the purchase requirements.",
    action:
      "Check the delivery, inspection and acceptance evidence. Use Complete AIR when the stage is ready to mark the case Ready for DV.",
  },
  {
    label: "Ready for DV",
    name: "Disbursement Voucher",
    meaning:
      "DV means Disbursement Voucher: the record prepared for review, approval and payment of an expense. Ready for DV means the procurement case has reached the voucher-preparation stage.",
    action:
      "Check the supporting procurement records, then use Create DV to prepare a linked draft voucher. If a voucher is already linked, use View DV to open the disbursement register. Submission, approval and payment follow in Disbursements.",
  },
];

export function ProcurementPath() {
  return (
    <Card className="mb-6 border-border bg-brand-soft">
      <CardContent className="p-4 sm:p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-warning">
          Procurement document path
        </h3>
        <ol aria-label="Procurement document stages" className="flex flex-wrap items-center gap-2">
          {stages.map((stage, index) => (
            <li key={stage.label} className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-lg border border-warning/30 bg-card py-1 pl-3 pr-1">
                <span className="text-xs font-bold text-secondary">{stage.label}</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      aria-label={`About ${stage.label}: ${stage.name}`}
                      title={`What does ${stage.label === "Ready for DV" ? "DV" : stage.label} mean?`}
                    >
                      <HelpCircle size={16} aria-hidden="true" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader className="pr-5 text-left">
                      <p className="mb-1 text-xs font-semibold text-brand-ink">
                        Procurement · Step {index + 1} of {stages.length}
                      </p>
                      <DialogTitle className="leading-snug">
                        {stage.label === "Ready for DV" ? "DV" : stage.label} — {stage.name}
                      </DialogTitle>
                      <DialogDescription className="pt-2 leading-6">
                        {stage.meaning}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-xl bg-muted p-4 text-sm">
                      <h4 className="font-semibold">What to do at this stage</h4>
                      <p className="mt-2 leading-6 text-muted-foreground">{stage.action}</p>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Stage buttons track progress. Keep the required supporting documents with your
                      records; completing a stage does not generate or verify those documents.
                    </p>
                  </DialogContent>
                </Dialog>
              </div>
              {index < stages.length - 1 && (
                <ChevronRight size={14} className="text-brand-ink" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          Select a ? to learn each acronym and the next step. Keep the corresponding quotations,
          approvals and inspection evidence with your records.
        </p>
      </CardContent>
    </Card>
  );
}
