"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Confirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
};
type Confirm = (options: Confirmation) => Promise<boolean>;
const ConfirmContext = createContext<Confirm | null>(null);

/** Shared themed replacement for the existing browser confirmation prompts. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Confirmation | null>(null);
  const resolve = useRef<((answer: boolean) => void) | null>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<Confirm>(
    (options) =>
      new Promise((answer) => {
        resolve.current?.(false);
        resolve.current = answer;
        setRequest(options);
      }),
    [],
  );

  useEffect(
    () => () => {
      resolve.current?.(false);
    },
    [],
  );

  function finish(answer: boolean) {
    resolve.current?.(answer);
    resolve.current = null;
    setRequest(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={request !== null}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        <DialogContent
          className="rounded-2xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancel.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{request?.title}</DialogTitle>
            <DialogDescription className="pt-2 leading-6">{request?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button ref={cancel} variant="outline" onClick={() => finish(false)}>
              Cancel
            </Button>
            <Button
              variant={request?.destructive ? "destructive" : "accent"}
              onClick={() => finish(true)}
            >
              {request?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used within ConfirmProvider");
  return confirm;
}
