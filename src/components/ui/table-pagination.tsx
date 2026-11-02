"use client";

import { useId } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { pageSizes } from "@/lib/pagination";
import { Button } from "./button";

type Pagination = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  start: number;
  end: number;
  setPage(page: number): void;
  setPageSize(size: number): void;
};

export function TablePagination({
  pagination: p,
  label,
}: {
  pagination: Pagination;
  label: string;
}) {
  const id = useId();
  return (
    <nav
      aria-label={`${label} pagination`}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground"
    >
      <p role="status" aria-live="polite">
        Showing {p.start}–{p.end} of {p.total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id}>Rows per page</label>
        <select
          id={id}
          value={p.pageSize}
          onChange={(event) => p.setPageSize(Number(event.target.value))}
          className="h-8 rounded-lg border border-border bg-card px-2 text-foreground"
        >
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <Button
          size="icon"
          variant="outline"
          aria-label="First page"
          disabled={p.page === 1}
          onClick={() => p.setPage(1)}
        >
          <ChevronsLeft size={15} />
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={p.page === 1}
          onClick={() => p.setPage(p.page - 1)}
        >
          <ChevronLeft size={15} />
          Previous
        </Button>
        <span className="whitespace-nowrap px-1">
          Page {p.page} of {p.pageCount}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={p.page === p.pageCount}
          onClick={() => p.setPage(p.page + 1)}
        >
          Next
          <ChevronRight size={15} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Last page"
          disabled={p.page === p.pageCount}
          onClick={() => p.setPage(p.pageCount)}
        >
          <ChevronsRight size={15} />
        </Button>
      </div>
    </nav>
  );
}
