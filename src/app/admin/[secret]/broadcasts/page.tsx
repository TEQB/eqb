"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/ui/toaster";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  error_log: string | null;
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

  const [recipientMode, setRecipientMode] = useState<"filter" | "specific">("filter");
  const [selectedStudents, setSelectedStudents] = useState<StudentPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentPreview[]>([]);
  const [searching, setSearching] = useState(false);

  const [recipientTotal, setRecipientTotal] = useState<number | null>(null);
  const [previewStudents, setPreviewStudents] = useState<StudentPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [errorBroadcast, setErrorBroadcast] = useState<Broadcast | null>(null);

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

  // Student search with debounce
  useEffect(() => {
    if (!searchQuery.trim() || recipientMode !== "specific") {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ action: "students", search: searchQuery.trim() });
        const res = await fetch(`/api/admin?${params}`);
        const data = await res.json();
        const results = (data.students ?? []) as StudentPreview[];
        const selectedIds = new Set(selectedStudents.map((s) => s.id));
        setSearchResults(results.filter((s: StudentPreview) => !selectedIds.has(s.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedStudents, recipientMode]);

  const addStudent = (student: StudentPreview) => {
    setSelectedStudents((prev) => [...prev, student]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeStudent = (id: string) => {
    setSelectedStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (recipientMode === "specific" && selectedStudents.length > 0) {
      params.set("student_ids", selectedStudents.map((s) => s.id).join(","));
    } else {
      if (selectedFaculty) params.set("faculty_id", selectedFaculty);
      if (selectedProgramme) params.set("programme_id", selectedProgramme);
      if (selectedLevel) params.set("level", selectedLevel);
    }
    return params;
  }, [recipientMode, selectedStudents, selectedFaculty, selectedProgramme, selectedLevel]);

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
  const isFiltered = recipientMode === "specific"
    ? selectedStudents.length > 0
    : !!(selectedFaculty || selectedProgramme || selectedLevel);

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
      if (recipientMode === "specific" && selectedStudents.length > 0) {
        payload.student_ids = selectedStudents.map((s) => s.id);
      } else {
        if (selectedFaculty) payload.faculty_id = selectedFaculty;
        if (selectedProgramme) payload.programme_id = selectedProgramme;
        if (selectedLevel) payload.level = parseInt(selectedLevel);
      }

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
      setSelectedStudents([]);
      setRecipientMode("filter");
      fetchBroadcasts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapTag = useCallback((tag: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.substring(start, end);
    const before = body.substring(0, start);
    const after = body.substring(end);
    const wrapped = selected ? `<${tag}>${selected}</${tag}>` : `<${tag}></${tag}>`;
    setBody(before + wrapped + after);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + wrapped.length, start + wrapped.length);
    });
  }, [body]);

  const insertBr = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = body.substring(0, pos);
    const after = body.substring(ta.selectionEnd);
    setBody(before + "<br>" + after);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(pos + 4, pos + 4);
    });
  }, [body]);

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
          Use plain text or HTML for the message body.
        </p>

        <form onSubmit={handleSend} className="mt-5 space-y-4">
          {/* Recipient mode toggle */}
          <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-3">
            <span className="text-sm font-medium text-gray-700">Send to:</span>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="recipient-mode"
                checked={recipientMode === "filter"}
                onChange={() => setRecipientMode("filter")}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Filter by faculty / programme / level</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="recipient-mode"
                checked={recipientMode === "specific"}
                onChange={() => setRecipientMode("specific")}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Select specific students</span>
            </label>
          </div>

          {recipientMode === "filter" ? (
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
                  disabled={!selectedFaculty}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Search and select students
              </label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or matric number..."
                  className="block w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                />
                {searching && (
                  <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => addStudent(s)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary-50"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{s.full_name}</span>
                        <span className="ml-2 text-gray-500">{s.matric_number}</span>
                      </div>
                      <span className="text-xs text-gray-400">{s.programme_name} - Lvl {s.current_level}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedStudents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedStudents.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700"
                    >
                      {s.full_name} ({s.matric_number})
                      <button
                        type="button"
                        onClick={() => removeStudent(s.id)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-primary-400 hover:bg-primary-200 hover:text-primary-700"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {isFiltered && (
            <div className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800">
              {previewLoading ? (
                "Counting matching students..."
              ) : (
                <>
                  <strong>{totalToSend ?? 0}</strong> student{totalToSend !== 1 ? "s" : ""} match{totalToSend !== 1 ? "" : "es"} the selected {recipientMode === "specific" ? "students" : "filters"}.
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
            <label className="block text-sm font-medium text-gray-700">
              Message body
            </label>
            <div className="mt-1 rounded-xl border border-gray-300 focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-600/20 overflow-hidden">
              <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => wrapTag("strong")}
                  title="Bold"
                  className="rounded-md px-2 py-1 text-sm font-bold text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                >B</button>
                <button
                  type="button"
                  onClick={() => wrapTag("em")}
                  title="Italic"
                  className="rounded-md px-2 py-1 text-sm italic text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                >I</button>
                <button
                  type="button"
                  onClick={() => wrapTag("u")}
                  title="Underline"
                  className="rounded-md px-2 py-1 text-sm underline text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                >U</button>
                <span className="mx-1 h-5 w-px bg-gray-300" />
                <button
                  type="button"
                  onClick={() => wrapTag("p")}
                  title="Paragraph"
                  className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                >P</button>
                <button
                  type="button"
                  onClick={() => insertBr()}
                  title="Line break"
                  className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                >&lt;br&gt;</button>
                <span className="mx-1 h-5 w-px bg-gray-300" />
                <button
                  type="button"
                  onClick={() => wrapTag("h3")}
                  title="Heading"
                  className="rounded-md px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                >H</button>
                <button
                  type="button"
                  onClick={() => wrapTag("ul")}
                  title="Bullet list"
                  className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                >ul</button>
                <button
                  type="button"
                  onClick={() => wrapTag("ol")}
                  title="Numbered list"
                  className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                >ol</button>
                <button
                  type="button"
                  onClick={() => wrapTag("li")}
                  title="List item"
                  className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                >li</button>
              </div>
              <textarea
                ref={textareaRef}
                id="body"
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="block w-full border-0 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-0"
                placeholder="Write your message here. Use the toolbar above for formatting."
                maxLength={50000}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              HTML is supported. You can also type HTML tags directly.               Available placeholders: <code className="text-primary-600">{`{{full_name}}`}</code> <code className="text-primary-600">{`{{matric_number}}`}</code> <code className="text-primary-600">{`{{email}}`}</code> <code className="text-primary-600">{`{{programme}}`}</code> <code className="text-primary-600">{`{{level}}`}</code> <code className="text-primary-600">{`{{login_url}}`}</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={!subject.trim() || !body.trim()}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Preview
            </button>
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

      {/* Preview modal */}
      <Dialog open={showPreview} onOpenChange={(open) => !open && setShowPreview(false)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Broadcast preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Recipients</h3>
              <p className="mt-1 text-sm text-gray-900">
                {totalToSend ?? "All students"} student{totalToSend !== 1 ? "s" : ""}
                {isFiltered && totalToSend !== null ? ` match the selected filters` : ""}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Subject</h3>
              <p className="mt-1 text-sm font-medium text-gray-900">{subject || "(no subject)"}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Message body</h3>
              <div
                className="mt-2 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {errorBroadcast && (
        <Dialog open={true} onOpenChange={() => setErrorBroadcast(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{`Delivery Errors \u2014 "${errorBroadcast.subject}"`}</DialogTitle>
            </DialogHeader>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {(() => {
                try {
                  const errors: { email: string; error: string }[] = JSON.parse(errorBroadcast.error_log ?? "[]");
                  if (errors.length === 0) return <p className="text-sm text-gray-500">No error details available.</p>;
                  return errors.map((e, i) => (
                    <div key={i} className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm">
                      <p className="font-medium text-red-800">{e.email}</p>
                      <p className="mt-0.5 text-red-600">{e.error}</p>
                    </div>
                  ));
                } catch {
                  return <p className="text-sm text-gray-500">Could not parse error log.</p>;
                }
              })()}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setErrorBroadcast(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{b.failure_count > 0 ? (
                      <button onClick={() => setErrorBroadcast(b)} className="font-medium text-red-600 hover:text-red-800 hover:underline">{b.failure_count}</button>
                    ) : b.failure_count}</td>
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
