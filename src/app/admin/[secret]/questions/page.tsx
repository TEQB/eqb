"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "@/components/ui/toaster";
import { SolutionsModal } from "@/components/admin/SolutionsModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatSession } from "@/lib/utils";

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
  level: number;
  uploader_email: string | null;
  programme_name?: string | null;
  courses: {
    code: string;
    title: string;
    level: number;
    department_id: string;
    programme: { name: string };
  } | null;
  profiles: { full_name: string; auth_user_id?: string } | null;
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
  const [selectedQuestion, setSelectedQuestion] = useState<{ id: string; code: string } | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editYear, setEditYear] = useState("");
  const [editSemester, setEditSemester] = useState("first");
  const [editExamType, setEditExamType] = useState("examination");
  const [editLevel, setEditLevel] = useState("100");
  const [editCourseCode, setEditCourseCode] = useState("");
  const [editCourseTitle, setEditCourseTitle] = useState("");
  const [editCourseLevel, setEditCourseLevel] = useState("100");
  const [savingEdit, setSavingEdit] = useState(false);

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
      if (!res.ok) {
        const err = data.error || "Failed to load";
        setError(err);
        toast.error(err);
        setLoading(false);
        return;
      }
      setQuestions(data.questions ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setError("Failed to load questions");
      toast.error("Failed to load questions");
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
      toast.success(
        action === "approve" ? "Question approved" : action === "suspend" ? "Question suspended" : "Question deleted",
      );
      fetchQuestions();
    } else {
      const data = await res.json();
      const err = data.error || "Action failed";
      setError(err);
      toast.error(err);
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

  useEffect(() => {
    if (!editingQuestion) return;
    setEditYear(String(editingQuestion.year));
    setEditSemester(editingQuestion.semester || "first");
    setEditExamType(editingQuestion.exam_type || "examination");
    setEditLevel(String(editingQuestion.level || 100));
    setEditCourseCode(editingQuestion.courses?.code || "");
    setEditCourseTitle(editingQuestion.courses?.title || "");
    setEditCourseLevel(String(editingQuestion.courses?.level || editingQuestion.level || 100));
  }, [editingQuestion]);

  async function handleSaveQuestionEdit() {
    if (!editingQuestion) return;
    setSavingEdit(true);
    try {
      const formData = new FormData();
      formData.set("id", editingQuestion.id);
      formData.set("year", editYear);
      formData.set("semester", editSemester);
      formData.set("exam_type", editExamType);
      formData.set("level", editLevel);

      const res = await fetch("/api/admin?action=update-question", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      if (editingQuestion.course_id && editingQuestion.courses) {
        const courseForm = new FormData();
        courseForm.set("id", editingQuestion.course_id);
        courseForm.set("code", editCourseCode);
        courseForm.set("title", editCourseTitle);
        courseForm.set("level", editCourseLevel);

        const courseRes = await fetch("/api/admin?action=update-course", {
          method: "POST",
          body: courseForm,
        });
        const courseData = await courseRes.json();
        if (!courseRes.ok) throw new Error(courseData.error || "Course update failed");
      }

      toast.success("Question updated");
      setEditingQuestion(null);
      fetchQuestions();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      toast.error(message);
      setError(message);
    } finally {
      setSavingEdit(false);
    }
  }

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
              <th className="px-5 py-3 font-medium text-gray-500">Uploader</th>
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
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{q.courses?.title || "-"}</p>
                      <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                        {q.programme_name || q.courses?.programme?.name || (q.courses?.department_id ? "Unknown programme" : "General")}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      {q.programme_name || q.courses?.programme?.name || (q.courses?.department_id ? "Unknown" : "General")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {q.courses?.level || "-"}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{q.profiles?.full_name || "Unknown"}</p>
                    {q.uploader_email && (
                      <p className="text-xs text-gray-400">{q.uploader_email}</p>
                    )}
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
                    <div className="flex flex-wrap items-center gap-2">
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
                      <button
                        onClick={() => setSelectedQuestion({ id: q.id, code: q.courses?.code || q.course_id.slice(0, 8) })}
                        className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                      >
                        Solutions
                      </button>
                      <button
                        onClick={() => setEditingQuestion(q)}
                        title="Edit question and course details"
                        aria-label="Edit question and course details"
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.654-1.653a1.125 1.125 0 111.591 1.59L8.59 16.938a4.5 4.5 0 00-1.908 1.188l-2.287 2.287a.375.375 0 01-.53 0l-.53-.53a.375.375 0 010-.53l2.287-2.287A4.5 4.5 0 007.81 15.16L16.862 4.487z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 20.25h-15" />
                        </svg>
                        Edit
                      </button>
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

      <SolutionsModal
        questionId={selectedQuestion?.id ?? ""}
        questionCode={selectedQuestion?.code ?? ""}
        isOpen={selectedQuestion !== null}
        onClose={() => setSelectedQuestion(null)}
        onDeleted={() => {}}
        onSolutionsChanged={fetchQuestions}
      />

      <Dialog open={editingQuestion !== null} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit question details</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-900">{editingQuestion.courses?.code || "Course"}</p>
                <p className="mt-1 text-sm text-gray-600">{editingQuestion.courses?.title || "-"}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Programme: {editingQuestion.programme_name || editingQuestion.courses?.programme?.name || "General"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Current session: {formatSession(editingQuestion.year)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="block text-xs font-medium text-gray-700">Session / Year</span>
                  <input
                    type="number"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-xs font-medium text-gray-700">Level</span>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    {[100, 200, 300, 400, 500].map((level) => (
                      <option key={level} value={level}>{level}L</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block text-xs font-medium text-gray-700">Semester</span>
                  <select
                    value={editSemester}
                    onChange={(e) => setEditSemester(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="first">First Semester</option>
                    <option value="second">Second Semester</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block text-xs font-medium text-gray-700">Exam Type</span>
                  <select
                    value={editExamType}
                    onChange={(e) => setEditExamType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="examination">Examination</option>
                    <option value="mid_semester">Mid Semester</option>
                  </select>
                </label>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-900">Course details</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 sm:col-span-2">
                    <span className="block text-xs font-medium text-gray-700">Course Code</span>
                    <input
                      type="text"
                      value={editCourseCode}
                      onChange={(e) => setEditCourseCode(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </label>

                  <label className="space-y-1 sm:col-span-2">
                    <span className="block text-xs font-medium text-gray-700">Course Title</span>
                    <input
                      type="text"
                      value={editCourseTitle}
                      onChange={(e) => setEditCourseTitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="block text-xs font-medium text-gray-700">Course Level</span>
                    <select
                      value={editCourseLevel}
                      onChange={(e) => setEditCourseLevel(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    >
                      {[100, 200, 300, 400, 500].map((level) => (
                        <option key={level} value={level}>{level}L</option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-gray-700">Programme</span>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {editingQuestion.programme_name || editingQuestion.courses?.programme?.name || "General"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-xs text-gray-500">Question and course details update immediately after saving.</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingQuestion(null)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuestionEdit}
                    disabled={savingEdit}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {savingEdit ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
