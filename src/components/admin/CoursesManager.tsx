"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "@/components/ui/toaster";

type Programme = { id: string; name: string };
type ProgrammeCourse = { programme_id: string; programmes: { id: string; name: string } };
type Course = {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: string;
  programme_id: string | null;
  programme_courses: ProgrammeCourse[];
};

export function CoursesManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ code: "", title: "", level: 0 });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    const [cRes, pRes] = await Promise.all([
      fetch("/api/admin?action=list-courses"),
      fetch("/api/admin?action=list-programmes"),
    ]);
    const [cData, pData] = await Promise.all([cRes.json(), pRes.json()]);
    if (cData.courses) setCourses(cData.courses);
    if (pData.programmes) setProgrammes(pData.programmes);
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => courses.filter((c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase())
    ),
    [courses, search],
  );

  const handleScopeChange = async (courseId: string, scope: string) => {
    const res = await fetch("/api/admin?action=update-course-scope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, scope }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to update scope");
      return;
    }
    toast.success("Scope updated");
    await loadData();
  };

  const handleRemoveProgramme = async (courseId: string, programmeId: string) => {
    const res = await fetch("/api/admin?action=remove-programme-course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, programme_id: programmeId }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to remove programme");
      return;
    }
    toast.success("Programme removed");
    await loadData();
  };

  const handleAddProgramme = async (courseId: string, programmeId: string) => {
    const res = await fetch("/api/admin?action=add-programme-course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, programme_id: programmeId }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to add programme");
      return;
    }
    toast.success("Programme added");
    await loadData();
  };

  const startEditing = (course: Course) => {
    setEditingId(course.id);
    setEditForm({ code: course.code, title: course.title, level: course.level });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ code: "", title: "", level: 0 });
  };

  const handleSave = async () => {
    if (!editingId) return;
    if (!editForm.code.trim() || !editForm.title.trim() || !editForm.level) {
      toast.error("Code, title, and level are required");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.append("id", editingId);
    fd.append("code", editForm.code.trim());
    fd.append("title", editForm.title.trim());
    fd.append("level", String(editForm.level));
    const res = await fetch("/api/admin?action=update-course", {
      method: "POST",
      body: fd,
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to update course");
      return;
    }
    toast.success("Course updated");
    cancelEditing();
    await loadData();
  };

  const handleDelete = async (courseId: string) => {
    setDeletingId(courseId);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const fd = new FormData();
    fd.append("id", deletingId);
    const res = await fetch("/api/admin?action=delete-course", {
      method: "POST",
      body: fd,
    });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to delete course");
      return;
    }
    toast.success("Course deleted");
    await loadData();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="space-y-4 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {courses.length} course{courses.length !== 1 ? "s" : ""} total
          </p>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="w-52 rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="text-sm text-gray-400">
              {search ? "No matching courses" : "No courses yet"}
            </p>
          </div>
        ) : (
          filtered.map((course, idx) => {
            const linkedProgrammeIds = new Set(
              course.programme_courses?.map((pc: ProgrammeCourse) => pc.programme_id) ?? []
            );
            const availableProgrammes = programmes.filter(
              (p) => !linkedProgrammeIds.has(p.id)
            );
            const isEditing = editingId === course.id;

            return (
              <div key={course.id} className="px-5 py-4 transition-colors hover:bg-gray-50/50">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-mono w-6">{idx + 1}.</span>
                          <input
                            value={editForm.code}
                            onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                            className="w-28 rounded border border-gray-300 px-2 py-1 text-sm font-semibold"
                            placeholder="Code"
                          />
                          <select
                            value={editForm.level}
                            onChange={(e) => setEditForm((f) => ({ ...f, level: Number(e.target.value) }))}
                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                          >
                            {[100, 200, 300, 400, 500, 600, 700].map((lvl) => (
                              <option key={lvl} value={lvl}>Lvl {lvl}</option>
                            ))}
                          </select>
                        </div>
                        <input
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          placeholder="Course title"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-mono w-6">{idx + 1}.</span>
                          <span className="font-semibold text-gray-900">{course.code}</span>
                          <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                            Lvl {course.level}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">{course.title}</p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={course.scope}
                      onChange={(e) => handleScopeChange(course.id, e.target.value)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    >
                      <option value="departmental">Departmental</option>
                      <option value="shared">Shared</option>
                      <option value="general">General</option>
                    </select>

                    {!isEditing && (
                      <>
                        <button
                          onClick={() => startEditing(course)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Edit course"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete course"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {course.scope === "shared" && !isEditing && (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {course.programme_courses?.map((pc: ProgrammeCourse) => (
                        <span
                          key={pc.programme_id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                        >
                          {pc.programmes?.name || pc.programme_id.slice(0, 8)}
                          <button
                            onClick={() => handleRemoveProgramme(course.id, pc.programme_id)}
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-700"
                            title="Remove programme"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>

                    {availableProgrammes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddProgramme(course.id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        >
                          <option value="" disabled>Add programme...</option>
                          {availableProgrammes.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete course?</h3>
            <p className="mt-2 text-sm text-gray-500">
              This will permanently delete this course and all associated data. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
