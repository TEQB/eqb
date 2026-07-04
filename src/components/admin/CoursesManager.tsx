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

            return (
              <div key={course.id} className="px-5 py-4 transition-colors hover:bg-gray-50/50">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono w-6">{idx + 1}.</span>
                      <span className="font-semibold text-gray-900">{course.code}</span>
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                        Lvl {course.level}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">{course.title}</p>
                  </div>

                  <select
                    value={course.scope}
                    onChange={(e) => handleScopeChange(course.id, e.target.value)}
                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="departmental">Departmental</option>
                    <option value="shared">Shared</option>
                    <option value="general">General</option>
                  </select>
                </div>

                {course.scope === "shared" && (
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
    </div>
  );
}
