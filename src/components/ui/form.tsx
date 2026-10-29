"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type FormEvent,
  type FormHTMLAttributes,
} from "react";

const SubmissionContext = createContext({ pending: false, label: "Saving…" });

export function useSubmission() {
  return useContext(SubmissionContext);
}

/** Keeps existing submit handlers, with a synchronous guard against repeated submits. */
export function Form({
  onSubmit,
  pendingLabel = "Saving…",
  children,
  ...props
}: Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  onSubmit?(event: FormEvent<HTMLFormElement>): unknown;
  pendingLabel?: string;
}) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (inFlight.current) {
      event.preventDefault();
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError("");
    // Native POST forms keep their browser navigation and display progress until it leaves.
    if (!onSubmit) return;
    event.preventDefault();
    try {
      await onSubmit(event);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The action could not be completed. Please try again.",
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <SubmissionContext.Provider value={{ pending, label: pendingLabel }}>
      <form {...props} onSubmit={submit} aria-busy={pending}>
        {children}
        <ActionError error={error} />
      </form>
    </SubmissionContext.Provider>
  );
}

export function ActionError({ error }: { error: string }) {
  return error ? (
    <p
      role="alert"
      className="col-span-full rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs leading-5 text-danger"
    >
      {error}
    </p>
  ) : null;
}
