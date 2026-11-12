"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  display_type: "modal" | "banner";
  duration_type: string;
  duration_value: number;
  created_at: string;
}

export function Announcements() {
  const supabase = createClient();
  const [items, setItems] = useState<Announcement[]>([]);
  const [modalQueue, setModalQueue] = useState<Announcement[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  const mark = useCallback(async (id: string, action: "shown" | "dismiss") => {
    try {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcement_id: id, action }),
      });
    } catch {
      // non-fatal
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements");
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.announcements ?? []) as Announcement[];
      setItems(list);
      const modals = list.filter((a) => a.display_type === "modal");
      if (modals.length > 0) {
        setModalQueue(modals);
        modals.forEach((m) => mark(m.id, "shown"));
      }
    } catch {
      // non-fatal
    }
  }, [mark]);

  useEffect(() => {
    fetchAnnouncements();

    // Realtime: listen for new announcements
    const channel = supabase
      .channel("announcements")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        () => {
          fetchAnnouncements();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchAnnouncements]);

  const closeModal = (a: Announcement) => {
    setModalQueue((q) => q.filter((m) => m.id !== a.id));
    mark(a.id, "dismiss");
  };

  const dismissBanner = (id: string) => {
    setDismissedBanners((s) => new Set(s).add(id));
    mark(id, "dismiss");
  };

  const banners = items.filter(
    (a) => a.display_type === "banner" && !dismissedBanners.has(a.id),
  );
  const currentModal = modalQueue[0] ?? null;

  return (
    <>
      {banners.length > 0 && (
        <div className="mb-4 space-y-2">
          {banners.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
            >
              <Megaphone size={18} className="mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                <p className="mt-0.5 text-sm text-gray-600 whitespace-pre-wrap">{a.body}</p>
              </div>
              <button
                onClick={() => dismissBanner(a.id)}
                className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-primary/10 hover:text-gray-600"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {currentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Megaphone size={20} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-gray-900">{currentModal.title}</h3>
                <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{currentModal.body}</p>
              </div>
              <button
                onClick={() => closeModal(currentModal)}
                className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => closeModal(currentModal)}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
