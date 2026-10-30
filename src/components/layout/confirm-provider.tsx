"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  FeedbackContext,
  useFeedback,
  type Confirmation,
  type FeedbackNotice,
} from "./feedback-context";

type Request = (
  | { kind: "confirm"; options: Confirmation; resolve(answer: boolean): void }
  | { kind: "success" | "error"; options: FeedbackNotice }
) & { trigger: HTMLElement | null };

/** One queue for confirmations and results, including actions inside other dialogs. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const active = useRef<Request | null>(null);
  const queue = useRef<Request[]>([]);
  const initialFocus = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const enqueue = useCallback((next: Request) => {
    if (active.current) queue.current.push(next);
    else {
      active.current = next;
      setRequest(next);
    }
  }, []);
  const confirm = useCallback(
    (options: Confirmation) =>
      new Promise<boolean>((resolve) => {
        enqueue({
          kind: "confirm",
          options,
          resolve,
          trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        });
      }),
    [enqueue],
  );
  const success = useCallback(
    (options: FeedbackNotice) => {
      enqueue({
        kind: "success",
        options,
        trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      });
    },
    [enqueue],
  );
  const error = useCallback(
    (options: FeedbackNotice) => {
      enqueue({
        kind: "error",
        options,
        trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      });
    },
    [enqueue],
  );
  const value = useMemo(() => ({ confirm, success, error }), [confirm, success, error]);

  useEffect(
    () => () => {
      for (const item of [active.current, ...queue.current])
        if (item?.kind === "confirm") item.resolve(false);
      active.current = null;
      queue.current = [];
    },
    [],
  );
  useEffect(() => {
    if (request) initialFocus.current?.focus();
  }, [request]);

  function finish(answer = false) {
    const item = active.current;
    if (!item || item !== request) return;
    returnFocus.current = item.trigger;
    const next = queue.current.shift() ?? null;
    active.current = next;
    setRequest(next);
    if (item.kind === "confirm") item.resolve(answer);
  }

  const kind = request?.kind ?? "confirm";
  const Icon = kind === "success" ? CircleCheck : kind === "error" ? CircleAlert : ShieldQuestion;
  const destructive = request?.kind === "confirm" && request.options.destructive;
  const tone =
    kind === "success"
      ? "bg-success-soft text-success"
      : kind === "error" || destructive
        ? "bg-danger-soft text-danger"
        : "bg-brand-soft text-brand-ink";
  const strip =
    kind === "success" ? "bg-success" : kind === "error" || destructive ? "bg-danger" : "bg-brand";
  const dismissLabel =
    request?.kind === "success" || request?.kind === "error"
      ? (request.options.dismissLabel ?? (kind === "error" ? "Back to form" : "Done"))
      : "Done";

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Dialog
        open={request !== null}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        <DialogContent
          data-feedback-kind={kind}
          overlayClassName="z-[80]"
          className="z-[90] gap-0 overflow-hidden rounded-[24px] p-0 sm:max-w-[440px] sm:rounded-[24px]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            initialFocus.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (active.current) return;
            const target = returnFocus.current;
            if (target?.isConnected && !target.closest('[aria-hidden="true"], [inert]'))
              target.focus();
            else
              document.querySelector<HTMLElement>("main button:not([disabled]), main a")?.focus();
          }}
        >
          <div className={`h-1 ${strip}`} aria-hidden="true" />
          <div className="max-h-[65dvh] overflow-y-auto px-6 pb-6 pt-7 sm:px-7">
            <div className={`mb-5 grid h-14 w-14 place-items-center rounded-2xl ${tone}`}>
              <Icon size={28} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">
              {kind === "confirm"
                ? "Please confirm"
                : kind === "success"
                  ? "Completed"
                  : "Action needed"}
            </p>
            <DialogTitle className="pr-3 text-xl font-bold leading-7 tracking-tight text-foreground">
              {request?.options.title}
            </DialogTitle>
            <DialogDescription className="mt-3 break-words text-sm leading-6 text-secondary">
              {request?.options.description}
            </DialogDescription>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/50 px-6 py-5 sm:flex-row sm:justify-end sm:px-7">
            {request?.kind === "confirm" ? (
              <>
                <Button
                  type="button"
                  ref={initialFocus}
                  variant="outline"
                  className="sm:min-w-24"
                  onClick={() => finish(false)}
                >
                  {request.options.cancelLabel ?? "Cancel"}
                </Button>
                <Button
                  type="button"
                  variant={request.options.destructive ? "destructive" : "accent"}
                  onClick={() => finish(true)}
                >
                  {request.options.confirmLabel}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                ref={initialFocus}
                variant={kind === "success" ? "accent" : "outline"}
                className="w-full sm:w-auto sm:min-w-28"
                onClick={() => finish()}
              >
                {dismissLabel}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </FeedbackContext.Provider>
  );
}

/** Existing callers keep the same confirmation API. */
export function useConfirm() {
  return useFeedback().confirm;
}
export { useFeedback } from "./feedback-context";
