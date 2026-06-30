"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toaster";

interface AdminSolution {
  id: string;
  body: string | null;
  file_url: string | null;
  author_name: string;
  author_email: string | null;
  upvotes: number;
  downvotes: number;
  rating_sum: number;
  rating_count: number;
  created_at: string;
}

interface SolutionsModalProps {
  questionId: string;
  questionCode: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onSolutionsChanged: () => void;
}

function SolutionRow({
  solution,
  onDelete,
  onSolutionsChanged,
}: {
  solution: AdminSolution;
  onDelete: (id: string) => void;
  onSolutionsChanged: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const average = solution.rating_count > 0 ? solution.rating_sum / solution.rating_count : 0;

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const formData = new FormData();
      formData.set("id", solution.id);
      const res = await fetch("/api/admin?action=delete-solution", { method: "POST", body: formData });
      if (res.ok) {
        toast.success("Solution removed");
        onDelete(solution.id);
        onSolutionsChanged();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete solution");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{solution.author_name}</span>
            {solution.author_email && (
              <span className="text-xs text-gray-400">{solution.author_email}</span>
            )}
            {solution.rating_count > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] font-semibold text-secondary-700">
                <svg className="h-3 w-3 fill-secondary" viewBox="0 0 24 24">
                  <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                {average.toFixed(1)} ({solution.rating_count})
              </span>
            )}
          </div>
          {solution.body && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{solution.body}</p>
          )}
          {solution.file_url && (
            <div className="mt-3">
              {solution.file_url.match(/\.(jpg|jpeg|png)$/i) ? (
                <a
                  href={`/api/storage/${solution.file_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden rounded-lg border border-gray-200"
                  style={{ maxHeight: 200, maxWidth: 300 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/storage/${solution.file_url}`}
                    alt="Solution attachment"
                    className="w-full object-contain"
                  />
                </a>
              ) : (
                <a
                  href={`/api/storage/${solution.file_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  View file
                </a>
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-400">
            {new Date(solution.created_at).toLocaleDateString()} &middot; {solution.upvotes} upvotes &middot; {solution.downvotes} downvotes
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            confirmDelete
              ? "bg-red-600 text-white hover:bg-red-700"
              : "border border-red-200 text-red-600 hover:bg-red-50"
          } disabled:opacity-50`}
        >
          {deleting ? "Removing..." : confirmDelete ? "Confirm" : "Remove"}
        </button>
      </div>
    </div>
  );
}

export function SolutionsModal({
  questionId,
  questionCode,
  isOpen,
  onClose,
  onDeleted,
  onSolutionsChanged,
}: SolutionsModalProps) {
  const [solutions, setSolutions] = useState<AdminSolution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin?action=question-solutions&question_id=${questionId}`);
        const data = await res.json();
        if (data.solutions) setSolutions(data.solutions);
      } catch {
        toast.error("Failed to load solutions");
      }
      setLoading(false);
    }
    load();
  }, [isOpen, questionId]);

  if (!isOpen) return null;

  const handleDelete = (id: string) => {
    setSolutions((prev) => prev.filter((s) => s.id !== id));
    onDeleted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Solutions</h3>
            <p className="mt-0.5 text-sm text-gray-500">
              {questionCode} &middot; {solutions.length} submitted
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : solutions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12">
              <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <p className="text-sm text-gray-400">No solutions submitted yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {solutions.map((s) => (
                <SolutionRow key={s.id} solution={s} onDelete={handleDelete} onSolutionsChanged={onSolutionsChanged} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}