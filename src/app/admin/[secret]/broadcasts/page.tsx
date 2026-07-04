"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/ui/toaster";

type Broadcast = {
  id: string;
  subject: string;
  recipient_count: number;
  success_count: number;
  failure_count: number;
  status: string;
  created_at: string | null;
  sent_at: string | null;
  sent_by_name: string;
};

type Faculty = { id: string; name: string; slug: string };
type Programme = { id: string; name: string; faculty_id: string };

type StudentPreview = {
  id: string;
  full_name: string;
  matric_number: string;
  current_level: number;
  programme_name: string;
  faculty_name: string;
};

const LEVEL_OPTIONS = [100, 200, 300, 400, 500];

export default function AdminBroadcastsPage() {
  const params = useParams();
  const secret = params.secret as string;

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedProgramme, setSelectedProgramme] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");

  const [recipientTotal, setRecipientTotal] = useState<number | null>(null);
  const [previewStudents, setPreviewStudents] = useState<StudentPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin?action=list-broadcasts");
      if (!res.ok) throw new Error("Failed to load broadcasts");
      const data = await res.json();
      setBroadcasts(data.broadcasts ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load broadcasts");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFaculties = useCallback(async () => {
    try {
      const res = await fetch("/api/admin?action=faculties");
      if (!res.ok) throw new Error("Failed to load faculties");
      const data = await res.json();
      setFaculties(data.faculties ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load faculties");
    }
  }, []);

  useEffect(() => {
    fetchBroadcasts();
    fetchFaculties();
  }, [fetchBroadcasts, fetchFaculties]);

  useEffect(() => {
    if (!selectedFaculty) {
      setProgrammes([]);
      return;
    }
    async function load() {
      try {
        const res = await fetch(`/api/admin?action=programmes`);
        if (!res.ok) throw new Error("Failed to load programmes");
        const data = await res.json();
        const filtered = (data.programmes ?? []).filter(
          (p: Programme) => p.faculty_id === selectedFaculty,
        );
        setProgrammes(filtered);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load programmes");
      }
    }
    load();
  }, [selectedFaculty]);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedFaculty) params.set("faculty_id", selectedFaculty);
    if (selectedProgramme) params.set("programme_id", selectedProgramme);
    if (selectedLevel) params.set("level", selectedLevel);
    return params;
  }, [selectedFaculty, selectedProgramme, selectedLevel]);

  const fetchRecipients = useCallback(async () => {
    const params = buildFilterParams();
    if (!params.toString()) {
      setRecipientTotal(null);
      setPreviewStudents([]);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin?action=list-broadcast-recipients&${params}`);
      if (!res.ok) throw new Error("Failed to load recipients");
      const data = await res.json();
      setRecipientTotal(data.total ?? 0);
      setPreviewStudents(data.students ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load recipients");
    } finally {
      setPreviewLoading(false);
    }
  }, [buildFilterParams]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const totalToSend = recipientTotal !== null ? recipientTotal : null;
  const isFiltered = selectedFaculty || selectedProgramme || selectedLevel;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toast.warning("Subject and message body are required");
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        subject: subject.trim(),
        html_body: body.trim(),
      };
      if (selectedFaculty) payload.faculty_id = selectedFaculty;
      if (selectedProgramme) payload.programme_id = selectedProgramme;
      if (selectedLevel) payload.level = parseInt(selectedLevel);

      const res = await fetch("/api/admin?action=send-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send broadcast");

      toast.success(`Broadcast sent to ${data.total} students (${data.successCount} succeeded, ${data.failureCount} failed)`);
      setSubject("");
      setBody("");
      setSelectedFaculty("");
      setSelectedProgramme("");
      setSelectedLevel("");
      fetchBroadcasts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
      : "-";

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-success-50 text-success-700",
      partial: "bg-amber-50 text-amber-700",
      failed: "bg-danger-50 text-danger-700",
    };
    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-50 text-gray-700"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Broadcasts</h2>
          <p className="mt-1 text-sm text-gray-500">
            Compose and send email broadcasts to students.
          </p>
        </div>
        <Link
          href={`/admin/${secret}/dashboard`}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Compose Broadcast</h3>
        <p className="mt-1 text-sm text-gray-500">
          Use plain text or HTML for the message body. Leave filters empty to send to all students.
        </p>

        <form onSubmit={handleSend} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="faculty" className="block text-sm font-medium text-gray-700">
                Faculty
              </label>
              <select
                id="faculty"
                value={selectedFaculty}
                onChange={(e) => {
                  setSelectedFaculty(e.target.value);
                  setSelectedProgramme("");
                }}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              >
                <option value="">All faculties</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="programme" className="block text-sm font-medium text-gray-700">
                Programme
              </label>
              <select
                id="programme"
                value={selectedProgramme}
                onChange={(e) => setSelectedProgramme(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                disabled={!selectedFaculty}
              >
                <option value="">All programmes</option>
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="level" className="block text-sm font-medium text-gray-700">
                Level
              </label>
              <select
                id="level"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              >
                <option value="">All levels</option>
                {LEVEL_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l} Level</option>
                ))}
              </select>
            </div>
          </div>

          {isFiltered && (
            <div className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800">
              {previewLoading ? (
                "Counting matching students..."
              ) : (
                <>
                  <strong>{totalToSend ?? 0}</strong> student{totalToSend !== 1 ? "s" : ""} match
                  {totalToSend !== 1 ? "" : "es"} the selected filters.
                </>
              )}
            </div>
          )}

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              placeholder="e.g. Important announcement regarding exams"
              maxLength={200}
            />
          </div>

          <div>
            <label htmlFor="body" className="block text-sm font-medium text-gray-700">
              Message body
            </label>
            <textarea
              id="body"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              placeholder="Write your message here. HTML tags are supported for formatting."
              maxLength={50000}
            />
            <p className="mt-1 text-xs text-gray-400">
              HTML is supported. Use &lt;br&gt; for line breaks, &lt;p&gt; for paragraphs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={sending || !subject.trim() || !body.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </span>
              ) : isFiltered && totalToSend !== null ? (
                `Send to ${totalToSend} student${totalToSend !== 1 ? "s" : ""}`
              ) : (
                "Send to all students"
              )}
            </button>
          </div>
        </form>
      </div>

      {isFiltered && previewStudents.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">
            Preview ({previewStudents.length} of {totalToSend} matching students)
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Matric</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Level</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Programme</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Faculty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{s.full_name}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">{s.matric_number}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">{s.current_level}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">{s.programme_name}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">{s.faculty_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Broadcast History</h3>
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
              <div className="h-4 w-2/3 rounded bg-gray-200" />
            </div>
          </div>
        ) : broadcasts.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Recipients</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Success</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Failed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Sent by</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {broadcasts.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{b.subject}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">{statusBadge(b.status)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{b.recipient_count}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{b.success_count}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{b.failure_count}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{b.sent_by_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(b.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">No broadcasts sent yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Use the form above to compose and send your first broadcast email to students.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
