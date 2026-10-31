"use client";

import { useState } from "react";
import { useFinance } from "@/data/demo/finance-provider";
import { PdfButton } from "@/components/financial/pdf-button";
import { auditDocument } from "@/features/reports/financial-documents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading, SearchField } from "@/components/financial/shared";

export function AuditView() {
  const { data, preview } = useFinance();
  const [query, setQuery] = useState("");
  const events = data.audit.filter((item) =>
    `${item.action} ${item.subject} ${item.detail}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="ACCOUNTABILITY"
        title="Activity & audit trail"
        action={<PdfButton documents={[auditDocument(events)]} />}
        description={
          preview
            ? "Follow the history of actions and the records they changed."
            : "Follow the history of demo actions and the records they changed."
        }
      />
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Recent activity</CardTitle>
          <SearchField value={query} onChange={setQuery} placeholder="Search activity..." />
        </CardHeader>
        <CardContent>
          {events.length ? (
            events.map((item) => (
              <div key={item.id} className="flex gap-4 border-b border-border py-4 last:border-0">
                <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-foreground">
                    {item.action}{" "}
                    <span className="font-normal text-muted-foreground">· {item.subject}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {item.actor} ·{" "}
                    {new Date(item.at).toLocaleString("en-PH", {
                      timeZone: "Asia/Manila",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No activity matches your search.
            </p>
          )}
        </CardContent>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">
        {preview
          ? "Live activity is recorded by the database. Administrators and auditors see their barangay's events."
          : "Browser demo history is editable by the browser owner. Production audit events require protected database posting."}
      </p>
    </>
  );
}
