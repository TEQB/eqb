"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "@/components/ui/toaster";

interface Solution {
  id: string;
  body: string | null;
  file_url: string | null;
  upvotes: number;
  downvotes: number;
  rating_sum: number;
  rating_count: number;
  status: string;
  created_at: string;
  submitted_by: string;
  author_name: string;
  author_email: string | null;
  question_id: string;
  course_code: string;
  course_title: string;
  course_level: number | null;
  year: number | null;
  semester: string | null;
  exam_type: string | null;
}

export default function AdminSolutionsPage() {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    published: number;
    pending_review: number;
    rejected: number;
  } | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin?action=solution-stats")
      .then((r) => r.json())
      .then((d) => { if (d) setStats(d); });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchSolutions = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ action: "list-solutions", page: String(page) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (searchQuery) params.set("search", searchQuery);
    try {
      const res = await fetch(`/api/admin?${params}`);
      const data = await res.json();
      if (!res.ok) {
        const err = data.error || "Failed to load";
        setError(err);
        toast.error(err);
        setLoading(false);
        return;
      }
      setSolutions(data.solutions ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setError("Failed to load solutions");
      toast.error("Failed to load solutions");
    }
    setLoading(false);
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchSolutions();
  }, [fetchSolutions]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this solution?")) return;
    const formData = new FormData();
    formData.set("id", id);
    const res = await fetch("/api/admin?action=delete-solution", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      toast.success("Solution deleted");
      fetchSolutions();
    } else {
      const data = await res.json();
      toast.error(data.error || "Delete failed");
    }
  }

  const startItem = (page - 1) * 20 + 1;
  const endItem = Math.min(page * 20, total);

  const statusBadge = (status: string) => {
    switch (status) {
      case "published": return "bg-success-100 text-success-700";
      case "pending_review": return "bg-warning-100 text-warning-700";
      case "rejected": return "bg-danger-100 text-danger-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const sessionLabel = (year: number | null, semester: string | null) => {
    if (!year) return "-";
    const s = semester === "first" ? "1st" : semester === "second" ? "2nd" : semester || "";
    return `${year}/${Number(year) + 1} ${s}`.trim();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Solutions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Browse and manage all solutions submitted by students
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Published</p>
            <p className="mt-1 text-2xl font-bold text-success-600">{stats.published.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Pending Review</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">{stats.pending_review.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Rejected</p>
            <p className="mt-1 text-2xl font-bold text-danger-600">{stats.rejected.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="pending_review">Pending Review</option>
          <option value="rejected">Rejected</option>
        </select>

        <div className="relative min-w-[200px] flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search course code..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 font-medium text-gray-500 w-10">#</th>
              <th className="px-5 py-3 font-medium text-gray-500">Course</th>
              <th className="px-5 py-3 font-medium text-gray-500">Author</th>
              <th className="px-5 py-3 font-medium text-gray-500">Session</th>
              <th className="px-5 py-3 font-medium text-gray-500">Votes</th>
              <th className="px-5 py-3 font-medium text-gray-500">Rating</th>
              <th className="px-5 py-3 font-medium text-gray-500">Date</th>
              <th className="px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="px-5 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : solutions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-400">No solutions found</p>
                  </div>
                </td>
              </tr>
            ) : (
              solutions.map((s, idx) => (
                <tr key={s.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-4 text-gray-400 text-xs">{startItem + idx}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{s.course_code}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{s.course_title}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{s.author_name}</p>
                    {s.author_email && (
                      <p className="text-xs text-gray-400">{s.author_email}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-700 text-xs">{sessionLabel(s.year, s.semester)}</td>
                  <td className="px-5 py-4 text-gray-700">
                    <span className="text-success-600 font-medium">{s.upvotes}</span>
                    {" / "}
                    <span className="text-danger-600 font-medium">{s.downvotes}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {s.rating_count > 0
                      ? `${(s.rating_sum / s.rating_count).toFixed(1)} (${s.rating_count})`
                      : "-"}
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(s.status)}`}>
                      {s.status === "pending_review" ? "Pending" : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.file_url && (
                        <a
                          href={s.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                        >
                          View File
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(s.id)}
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
