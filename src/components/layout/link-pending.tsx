"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/ui/spinner";

/** Must be rendered inside the Link whose transition it reflects. */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span
      role="status"
      aria-label="Opening page"
      className="ml-auto flex shrink-0 items-center text-brand-ink"
    >
      <Spinner className="h-3.5 w-3.5" />
    </span>
  ) : null;
}
