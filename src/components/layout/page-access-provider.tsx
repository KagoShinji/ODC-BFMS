"use client";

import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { canAccessPath, configurablePages, type PageKey } from "@/lib/auth/page-access";

// The login illustration renders outside a signed-in workspace.
const PageAccessContext = createContext<readonly PageKey[]>([
  ...configurablePages.map((page) => page.key),
  "settings",
  "staff",
  "branding",
]);

export function PageAccessProvider({
  pages,
  children,
}: {
  pages: readonly PageKey[];
  children: ReactNode;
}) {
  return <PageAccessContext.Provider value={pages}>{children}</PageAccessContext.Provider>;
}

export function usePageAccess() {
  const pages = useContext(PageAccessContext);
  return { pages, canOpen: (path: string) => canAccessPath(pages, path) };
}

/** Cross-module links become ordinary text when their destination is unavailable. */
export function PageLink({ href, children, className, ...props }: ComponentProps<typeof Link>) {
  const { canOpen } = usePageAccess();
  const path = typeof href === "string" ? href : (href.pathname ?? "");
  return canOpen(path) ? (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  ) : (
    <span className={className} aria-disabled="true">
      {children}
    </span>
  );
}
