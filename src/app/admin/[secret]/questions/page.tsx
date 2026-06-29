"use client";

import { useEffect, useState, useCallback } from "react";

interface Question {
  id: string;
  course_id: string;
  year: number;
  semester: string;
  exam_type: string;
  file_url: string | null;
  file_type: string;
  status: string;
  flag_count: number;
  created_at: string;
  courses: {
    code: string;
    title: string;
    level: number;
    department_id: string;
    departments: { name: string };
  } | null;
  profiles: { full_name: string } | null;
}

interface Programme {
  id: string;
  name: string;
}

export default function AdminQuestionsPage({
  params: _params,
}: {
  params: { secret: string };
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [programmeFilter, setProgrammeFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/admin?action=programmes")
      .then((r) => r.json())
      .then((d) => { if (d.programmes) setProgrammes(d.programmes); });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleStatusChange = (val: string) => { setStatusFilter(val); setPage(1); };
  const handleProgrammeChange = (val: string) => { setProgrammeFilter(val); setPage(1); };
  const handleLevelChange = (val: string) => { setLevelFilter(val); setPage(1); };

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ action: "list-all-questions", page: String(page) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (programmeFilter) params.set("programme_id", programmeFilter);
    if (levelFilter) params.set("level", levelFilter);
    if (searchQuery) params.set("search", searchQuery);
    try {
      const res = await fetch(`/api/admin?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to load"); setLoading(false); return; }
      setQuestions(data.questions ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setError("Failed to load questions");
    }
    setLoading(false);
  }, [page, statusFilter, programmeFilter, levelFilter, searchQuery]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  async function handleAction(id: string, action: string) {
    setActionMsg(null);
    const formData = new FormData();
    formData.set("id", id);
    const path = action === "approve" ? "restore-question" : action === "suspend" ? "suspend-question" : "delete-question";
    const res = await fetch(`/api/admin?action=${path}`, { method: "POST", body: formData });
    if (res.ok) {
      fetchQuestions();
    } else {
      const data = await res.json();
      setError(data.error || "Action failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this question?")) return;
    await handleAction(id, "delete");
  }

  const startItem = (page - 1) * 20 + 1;
  const endItem = Math.min(page * 20, total);

  const statusBadge = (status: string) => {
    switch (status) {
      case "published": return "bg-success-100 text-success-700";
      case "pending_review": return "bg-warning-100 text-warning-700";
      case "suspended": return "bg-danger-100 text-danger-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Browse, filter, and manage all uploaded past questions
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="pending_review">Pending Review</option>
          <option value="suspended">Suspended</option>
        </select>

        <select
          value={programmeFilter}
          onChange={(e) => handleProgrammeChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        >
          <option value="">All Programmes</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={levelFilter}
          onChange={(e) => handleLevelChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        >
          <option value="">All Levels</option>
          {[100, 200, 300, 400, 500].map((l) => (
            <option key={l} value={l}>{l}L</option>
          ))}
        </select>

        <div className="relative min-w-[200px] flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search courses..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {actionMsg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${actionMsg.ok ? "border-success-200 bg-success-50 text-success-700" : "border-danger-200 bg-danger-50 text-danger-700"}`}>
          {actionMsg.text}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-5 py-3 font-medium text-gray-500">Course Code</th>
              <th className="px-5 py-3 font-medium text-gray-500">Course Name</th>
              <th className="px-5 py-3 font-medium text-gray-500">Programme</th>
              <th className="px-5 py-3 font-medium text-gray-500">Level</th>
              <th className="px-5 py-3 font-medium text-gray-500">Uploaded By</th>
              <th className="px-5 py-3 font-medium text-gray-500">Upload Date</th>
              <th className="px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="px-5 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 animate-pulse rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <p className="text-sm text-gray-400">No questions found</p>
                  </div>
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-900">
                    {q.courses?.code || q.course_id?.slice(0, 8)}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {q.courses?.title || "-"}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {q.courses?.departments?.name || "-"}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {q.courses?.level || "-"}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {q.profiles?.full_name || "Unknown"}
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {new Date(q.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(q.status)}`}>
                      {q.status === "pending_review" ? "Pending Review" : q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {q.file_url && (
                        <a
                          href={q.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                        >
                          View
                        </a>
                      )}
                      {q.status === "pending_review" && (
                        <button
                          onClick={() => handleAction(q.id, "approve")}
                          className="rounded-lg bg-success-50 px-3 py-1.5 text-xs font-medium text-success-700 transition-colors hover:bg-success-100"
                        >
                          Approve
                        </button>
                      )}
                      {q.status === "published" && (
                        <button
                          onClick={() => handleAction(q.id, "suspend")}
                          className="rounded-lg bg-warning-50 px-3 py-1.5 text-xs font-medium text-warning-700 transition-colors hover:bg-warning-100"
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="rounded-lg bg-danger-50 px-3 py-1.5 text-xs font-medium text-danger-700 transition-colors hover:bg-danger-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Showing {startItem}–{endItem} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
