"use client";

import { useState } from "react";
import { paginate, pageSizes } from "@/lib/pagination";

export function usePagination<T>(items: readonly T[], resetKey: string) {
  const [state, setState] = useState({ key: resetKey, page: 1, size: 10 });
  const result = paginate(items, state.key === resetKey ? state.page : 1, state.size);
  // Adjust only this component's state, before rendering children, when scope,
  // filters or record deletions invalidate the current page.
  if (state.key !== resetKey || state.page !== result.page) {
    setState({ ...state, key: resetKey, page: result.page });
  }
  return {
    ...result,
    setPage: (page: number) => setState((current) => ({ ...current, key: resetKey, page })),
    setPageSize: (size: number) =>
      setState({
        key: resetKey,
        page: 1,
        size: pageSizes.includes(size as (typeof pageSizes)[number]) ? size : 10,
      }),
  };
}
