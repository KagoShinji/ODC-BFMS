import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export type PageSkeletonVariant = "table" | "dashboard" | "form" | "reports";

function PlaceholderCard({ chart = false }: { chart?: boolean }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="mt-3 h-3 w-48 max-w-full" />
      {chart ? (
        <div className="mt-8 flex h-44 items-end gap-3 border-b border-border px-2">
          {[65, 42, 78, 35, 56, 48].map((height, index) => (
            <Skeleton
              key={index}
              className="flex-1 rounded-b-none"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PageSkeleton({ variant = "table" }: { variant?: PageSkeletonVariant }) {
  return (
    <div
      role="status"
      aria-label="Loading page"
      aria-busy="true"
      className="w-full space-y-5 pb-6"
      data-page-skeleton={variant}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-3 w-72 max-w-[70vw]" />
        </div>
        <span className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <Spinner /> Loading page…
        </span>
      </div>
      <div aria-hidden="true" className="space-y-5">
        {variant === "form" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {[0, 1].map((card) => (
              <div key={card} className="space-y-6 rounded-3xl border border-border bg-card p-6">
                <Skeleton className="h-5 w-40" />
                {[0, 1, 2].map((field) => (
                  <div key={field} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
                <Skeleton className="h-10 w-32" />
              </div>
            ))}
          </div>
        ) : variant === "dashboard" || variant === "reports" ? (
          <div className="grid items-start gap-5 xl:grid-cols-[1.65fr_1fr]">
            <div className="space-y-5">
              <PlaceholderCard />
              <PlaceholderCard chart />
            </div>
            <div className="space-y-5">
              <PlaceholderCard />
              <PlaceholderCard />
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((card) => (
                <div key={card} className="space-y-4 rounded-3xl border border-border bg-card p-5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="flex items-center justify-between gap-4 p-6">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-9 w-48 max-w-[35%]" />
              </div>
              <div className="grid grid-cols-3 gap-4 border-y border-border bg-muted/40 px-6 py-4">
                {[0, 1, 2].map((column) => (
                  <Skeleton key={column} className="h-3 w-20" />
                ))}
              </div>
              {[0, 1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="grid grid-cols-3 gap-4 border-b border-border px-6 py-5 last:border-0"
                >
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function WorkspaceSkeleton() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <aside
        aria-hidden="true"
        className="hidden w-[244px] shrink-0 space-y-5 border-r border-border bg-sidebar p-6 lg:block"
      >
        <Skeleton className="mb-10 h-12 w-full" />
        {Array.from({ length: 9 }, (_, row) => (
          <Skeleton key={row} className="h-9 w-full" />
        ))}
      </aside>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div aria-hidden="true" className="flex h-[94px] items-center justify-between px-5 sm:px-7">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="px-5 sm:px-7">
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}
