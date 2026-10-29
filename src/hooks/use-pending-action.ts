"use client";

import { useCallback, useRef, useState } from "react";

/** Serializes related record actions so, for example, approve and reject cannot race. */
export function usePendingAction() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  const run = useCallback(
    async <T>(key: string, action: () => T | Promise<T>): Promise<T | undefined> => {
      if (inFlight.current) return;
      inFlight.current = true;
      setPending(key);
      setError("");
      try {
        return await action();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "The action could not be completed. Please try again.",
        );
      } finally {
        inFlight.current = false;
        setPending(null);
      }
    },
    [],
  );

  return { pending, error, run };
}
