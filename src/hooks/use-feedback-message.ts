"use client";

import { useCallback, useState } from "react";
import { useFeedback } from "@/components/layout/feedback-context";

type Message = { ok: boolean; text: string } | null;

/** Preserve inline context while displaying each action result once in a modal. */
export function useFeedbackMessage(successTitle: string, errorTitle: string) {
  const [message, setMessage] = useState<Message>(null);
  const { success, error } = useFeedback();
  const report = useCallback(
    (next: Message) => {
      setMessage(next);
      if (next?.ok) success({ title: successTitle, description: next.text });
      else if (next) error({ title: errorTitle, description: next.text });
    },
    [success, error, successTitle, errorTitle],
  );
  return [message, report] as const;
}
