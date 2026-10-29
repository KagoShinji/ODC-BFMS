"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { portalAddress } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** A barangay's branded sign-in address with a copy button. */
export function PortalLink({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyManually, setCopyManually] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  // A barangay subdomain when NEXT_PUBLIC_ROOT_DOMAIN is set, otherwise /b/<slug>.
  const url = portalAddress(slug, origin, process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "");
  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <code className="min-w-0 truncate rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs text-secondary">
          {url}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopyManually(true);
            }
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <Dialog open={copyManually} onOpenChange={setCopyManually}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Copy sign-in link</DialogTitle>
            <DialogDescription>
              Copy the selected address to share this barangay’s sign-in page.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Barangay sign-in address"
            value={url}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
