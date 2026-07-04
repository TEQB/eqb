"use client";

import { useEffect } from "react";

export function MarkFeedbackRead({ feedbackIds }: { feedbackIds: string[] }) {
  useEffect(() => {
    if (feedbackIds.length === 0) return;
    const markRead = async () => {
      for (const id of feedbackIds) {
        try {
          const formData = new FormData();
          formData.set("id", id);
          await fetch("/api/admin?action=mark-feedback-read", {
            method: "POST",
            body: formData,
          });
        } catch {
          // silently fail
        }
      }
    };
    markRead();
  }, [feedbackIds]);

  return null;
}
