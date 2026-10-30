"use client";

import { createContext, useContext } from "react";

export type Confirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
};
export type FeedbackNotice = { title: string; description: string; dismissLabel?: string };
export type Feedback = {
  confirm(options: Confirmation): Promise<boolean>;
  success(options: FeedbackNotice): void;
  error(options: FeedbackNotice): void;
};
export const FeedbackContext = createContext<Feedback | null>(null);

export function useFeedback() {
  const feedback = useContext(FeedbackContext);
  if (!feedback) throw new Error("useFeedback must be used within ConfirmProvider");
  return feedback;
}
export function useOptionalFeedback() {
  return useContext(FeedbackContext);
}
