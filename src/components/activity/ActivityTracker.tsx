"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ActivityLevel = "info" | "warn" | "error";

type ActivityPayload = {
  event: string;
  message: string;
  level?: ActivityLevel;
  path?: string;
  method?: string;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
};

function cleanText(value: string | null | undefined, max = 120) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function describeElement(el: HTMLElement) {
  const tag = el.tagName.toLowerCase();
  const label =
    cleanText(el.getAttribute("aria-label")) ||
    cleanText(el.getAttribute("title")) ||
    cleanText(el.textContent) ||
    cleanText(el.getAttribute("name")) ||
    cleanText(el.id);

  return {
    tag,
    label,
    id: el.id || null,
    name: el.getAttribute("name") || null,
    type: el.getAttribute("type") || null,
    href: el instanceof HTMLAnchorElement ? el.href : el.getAttribute("href"),
  };
}

async function sendActivity(payload: ActivityPayload) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/activity-log", blob);
      if (ok) return;
    }

    await fetch("/api/activity-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Best-effort logging only.
  }
}

export function ActivityTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPageViewRef = useRef<string>("");

  useEffect(() => {
    if (!pathname) return;
    const query = searchParams?.toString() || "";
    const pageKey = `${pathname}?${query}`;
    if (lastPageViewRef.current === pageKey) return;
    lastPageViewRef.current = pageKey;

    void sendActivity({
      event: "page_view",
      message: `Visited ${pathname}`,
      path: pathname,
      method: "GET",
      metadata: query ? { search: query } : undefined,
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const element = target.closest(
        "a, button, [role='button'], [data-track-activity='true']",
      ) as HTMLElement | null;
      if (!element) return;

      const description = describeElement(element);
      const eventName = element.tagName.toLowerCase() === "a" ? "ui_link_click" : "ui_click";

      void sendActivity({
        event: eventName,
        message: `Clicked ${description.label || description.tag}`,
        path: pathname || undefined,
        method: "CLICK",
        metadata: {
          ...description,
        },
      });
    };

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form) return;
      const submitter = event.submitter as HTMLElement | null;
      const description = submitter ? describeElement(submitter) : null;

      void sendActivity({
        event: "ui_form_submit",
        message: `Submitted form${form.getAttribute("name") ? ` ${form.getAttribute("name")}` : ""}`,
        path: pathname || undefined,
        method: (form.method || "POST").toUpperCase(),
        metadata: {
          formAction: form.getAttribute("action"),
          formName: form.getAttribute("name"),
          submitter: description,
        },
      });
    };

    const handleChange = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target instanceof HTMLSelectElement) {
        void sendActivity({
          event: "ui_select_change",
          message: `Changed ${target.name || target.id || "select"}`,
          path: pathname || undefined,
          method: "CHANGE",
          metadata: {
            field: target.name || target.id || null,
            value: target.value,
          },
        });
        return;
      }

      if (target instanceof HTMLInputElement && ["checkbox", "radio"].includes(target.type)) {
        void sendActivity({
          event: "ui_input_change",
          message: `Changed ${target.name || target.id || "input"}`,
          path: pathname || undefined,
          method: "CHANGE",
          metadata: {
            field: target.name || target.id || null,
            type: target.type,
            checked: target.checked,
            value: target.value,
          },
        });
      }
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("change", handleChange, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      document.removeEventListener("change", handleChange, true);
    };
  }, [pathname]);

  return null;
}
