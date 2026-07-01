"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toaster";
import { formatSession } from "@/lib/utils";

interface QueuedQuestion {
  id: string;
  course_id: string;
  year: number;
  semester: string;
  exam_type: string;
  file_type: string;
  courses: { code: string } | null;
  status: string;
  created_at: string;
}

export function SuspendedQueue({ secret: _secret }: { secret: string }) {
  const [questions, setQuestions] = useState<QueuedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/admin?action=queue");
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleAction(id: string, action: "restore" | "delete") {
    setError("");
    const formData = new FormData();
    formData.set("id", id);
    const res = await fetch(`/api/admin?action=${action}-question`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success(
        action === "restore" ? "Question restored" : "Question deleted",
      );
    } else {
      const data = await res.json();
      const err = data.error || "Action failed";
      setError(err);
      toast.error(err);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-12">
        <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-gray-500">No pending or suspended questions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}
      <div className="space-y-2">
        {questions.map((q) => (
          <div
            key={q.id}
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {q.courses?.code || q.course_id.slice(0, 8)}
                </span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  q.status === "suspended" ? "bg-danger-100 text-danger-700" : "bg-warning-100 text-warning-700"
                }`}>
                  {q.status === "suspended" ? "Suspended" : "Pending"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                {formatSession(q.year)} &middot; {q.semester === "first" ? "First" : "Second"} Semester &middot; {q.exam_type === "mid_semester" ? "Mid Semester" : "Examination"} &middot; {q.file_type?.toUpperCase()} &middot; {new Date(q.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => handleAction(q.id, "restore")}
                className="rounded-lg bg-primary-50 px-3.5 py-2 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
              >
                Restore
              </button>
              <button
                onClick={() => handleAction(q.id, "delete")}
                className="rounded-lg bg-danger-50 px-3.5 py-2 text-xs font-medium text-danger-700 transition-colors hover:bg-danger-100"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
