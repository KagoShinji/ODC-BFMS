"use client";

import { useCallback, useRef, useState } from "react";
import { useOptionalFeedback } from "@/components/layout/feedback-context";

/** Serializes related record actions so, for example, approve and reject cannot race. */
export function usePendingAction() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const feedback = useOptionalFeedback();

  const run = useCallback(
    async <T>(key: string, action: () => T | Promise<T>): Promise<T | undefined> => {
      if (inFlight.current) return;
      inFlight.current = true;
      setPending(key);
      setError("");
      try {
        return await action();
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "The action could not be completed. Please try again.";
        setError(message);
        feedback?.error({ title: "Unable to complete action", description: message });
      } finally {
        inFlight.current = false;
        setPending(null);
      }
    },
    [feedback],
  );

  return { pending, error, run };
}
