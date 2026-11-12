"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/ui/toaster";

type Announcement = {
  id: string;
  title: string;
  body: string;
  display_type: "modal" | "banner";
  duration_type: "once" | "days" | "weeks" | "months";
  duration_value: number;
  is_active: boolean;
  created_at: string | null;
  expires_at: string | null;
  created_by_name: string;
  seen_count: number;
};

const DURATION_LABELS: Record<string, string> = {
  once: "First login only",
  days: "Days",
  weeks: "Weeks",
  months: "Months",
};

export default function AdminAnnouncementsPage() {
  const params = useParams();
  const secret = params.secret as string;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [displayType, setDisplayType] = useState<"modal" | "banner">("modal");
  const [durationType, setDurationType] = useState<"once" | "days" | "weeks" | "months">("once");
  const [durationValue, setDurationValue] = useState(1);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin?action=list-announcements");
      if (!res.ok) throw new Error("Failed to load announcements");
      const data = await res.json();
      setAnnouncements(data.announcements ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.warning("Title and message are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin?action=create-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          display_type: displayType,
          duration_type: durationType,
          duration_value: durationType === "once" ? 1 : durationValue,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create announcement");
      toast.success("Announcement created");
      setTitle("");
      setBody("");
      setDisplayType("modal");
      setDurationType("once");
      setDurationValue(1);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a: Announcement) => {
    const res = await fetch("/api/admin?action=toggle-announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, is_active: !a.is_active }),
    });
    if (res.ok) fetchAnnouncements();
    else toast.error("Failed to update announcement");
  };

  const handleDelete = async (a: Announcement) => {
    if (!confirm(`Delete announcement "${a.title}"?`)) return;
    const res = await fetch("/api/admin?action=delete-announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id }),
    });
    if (res.ok) {
      toast.success("Announcement deleted");
      fetchAnnouncements();
    } else {
      toast.error("Failed to delete announcement");
    }
  };

  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Announcements</h2>
          <p className="mt-1 text-sm text-gray-500">
            Create pop-up modals or banners shown to students when they log in.
          </p>
        </div>
        <Link
          href={`/admin/${secret}/dashboard`}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Back to dashboard
        </Link>
      </div>

      {/* Create form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">New Announcement</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose how it appears and how long it keeps showing.
        </p>

        <form onSubmit={handleCreate} className="mt-5 space-y-4">
          <div>
            <label htmlFor="ann-title" className="block text-sm font-medium text-gray-700">
              Header / Title
            </label>
            <input
              id="ann-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              placeholder="e.g. New feature: Study Groups are here!"
            />
          </div>

          <div>
            <label htmlFor="ann-body" className="block text-sm font-medium text-gray-700">
              Message
            </label>
            <textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={4}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              placeholder="Write the announcement students will see..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-sm font-medium text-gray-700">Display as</span>
              <div className="mt-1 flex gap-2">
                {(["modal", "banner"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDisplayType(t)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                      displayType === t
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t === "modal" ? "Pop-up modal" : "Top banner"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700">Show for</span>
              <div className="mt-1 flex gap-2">
                <select
                  value={durationType}
                  onChange={(e) => setDurationType(e.target.value as typeof durationType)}
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                >
                  {Object.entries(DURATION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {durationType !== "once" && (
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={durationValue}
                    onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                  />
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {durationType === "once"
                  ? "Shows once per student, on their first login after this is created."
                  : `Keeps appearing on each login for ${durationValue} ${DURATION_LABELS[durationType].toLowerCase()}.`}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Publishing..." : "Publish announcement"}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">Published announcements</h3>
        </div>
        {loading ? (
          <p className="px-6 py-8 text-sm text-gray-500">Loading...</p>
        ) : announcements.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500">No announcements yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {announcements.map((a) => (
              <li key={a.id} className="px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">{a.title}</span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          a.display_type === "modal"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {a.display_type}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          a.is_active ? "bg-success-50 text-success-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {a.is_active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{a.body}</p>
                    <p className="mt-1.5 text-xs text-gray-400">
                      {a.duration_type === "once"
                        ? "First login only"
                        : `For ${a.duration_value} ${DURATION_LABELS[a.duration_type].toLowerCase()}`}
                      {" · "}Created {formatDate(a.created_at)} by {a.created_by_name}
                      {a.expires_at ? ` · Expires ${formatDate(a.expires_at)}` : ""}
                      {" · "}{a.seen_count} seen
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleToggle(a)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {a.is_active ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
