import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div
      data-theme="light"
      role="status"
      aria-label="Loading sign-in page"
      aria-busy="true"
      className="fixed inset-0 grid h-dvh overflow-hidden bg-card text-foreground lg:grid-cols-[1.08fr_.92fr]"
    >
      <div
        aria-hidden="true"
        className="hidden flex-col justify-between overflow-hidden bg-brand p-12 lg:flex"
      >
        <Skeleton className="h-11 w-52 bg-brand-foreground/20" />
        <div className="space-y-5">
          <Skeleton className="h-10 w-3/4 bg-brand-foreground/20" />
          <Skeleton className="h-10 w-2/3 bg-brand-foreground/20" />
          <Skeleton className="h-4 w-4/5 bg-brand-foreground/20" />
        </div>
        <div className="h-[35vh] rounded-2xl bg-brand-foreground/15" />
      </div>
      <div className="flex min-h-0 items-center justify-center px-6 py-5 sm:px-12">
        <div className="w-full max-w-[384px] space-y-6">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner /> Loading sign-in…
          </span>
          <div aria-hidden="true" className="space-y-6">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-3 w-56 max-w-full" />
            {[0, 1].map((field) => (
              <div key={field} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
