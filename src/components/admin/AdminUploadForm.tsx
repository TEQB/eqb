"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { formatSession, deriveLevelAndSemesterFromCode } from "@/lib/utils";
import { CreateCourseForm } from "@/components/courses/CreateCourseForm";
import { logger } from "@/lib/logger";

interface Programme {
  id: string;
  name: string;
  faculty_id: string;
  faculty_name: string;
}

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: string;
}

const MAX_PAGES = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return "File is too large. Max size is 10MB.";
  if (!ACCEPTED_TYPES.includes(file.type)) return "Unsupported file type. Please upload a PDF, JPG, or PNG.";
  return null;
}

function PageTile({
  index,
  file,
  onSelect,
  onRemove,
}: {
  index: number;
  file: File | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    const reason = validateFile(f);
    if (reason) { setError(reason); return; }
    setError(null);
    onSelect(f);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files?.[0]);
      }}
      className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-3 text-center transition-colors ${
        dragging ? "border-primary-400 bg-primary-50" : file ? "border-gray-200 bg-white hover:border-primary-300" : "border-gray-300 bg-gray-50/60 hover:border-primary-300 hover:bg-primary-50/40"
      }`}
    >
      <span className="absolute left-2 top-2 rounded-md bg-gray-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {index + 1}
      </span>
      {file ? (
        <>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="mb-1.5 h-16 w-full rounded-md object-cover" />
          ) : (
            <div className="mb-1.5 flex h-16 w-full items-center justify-center rounded-md bg-red-50">
              <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
          )}
          <p className="w-full truncate text-[11px] font-medium text-gray-700" title={file.name}>{file.name}</p>
          <p className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute right-1.5 top-1.5 hidden rounded-full bg-white/90 p-1 text-gray-500 shadow-sm hover:text-danger-600 group-hover:block"
            title="Remove page"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      ) : (
        <>
          <svg className="mx-auto h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="mt-1 text-xs font-medium text-gray-500">Page {index + 1}</p>
          <p className="text-[10px] text-gray-400">PDF/JPG/PNG · 10MB</p>
        </>
      )}
      {error && <p className="mt-1 text-[10px] text-danger-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
}

export function AdminUploadForm({ secret: _secret }: { secret: string }) {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [courseQuery, setCourseQuery] = useState("");
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [semester, setSemester] = useState("first");
  const [examType, setExamType] = useState("examination");
  const [pages, setPages] = useState<(File | null)[]>([null]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  useEffect(() => {
    fetch("/api/admin?action=courses")
      .then((r) => r.json())
      .then((data) => {
        if (data.courses) setCourses(data.courses);
      });
    fetch("/api/admin?action=programmes")
      .then((r) => r.json())
      .then((data) => {
        if (data.programmes) setProgrammes(data.programmes);
      });
  }, []);

  const firstPage = pages[0];
  const selectedCourse = courses.find((c) => c.id === courseId);

  useEffect(() => {
    if (!selectedCourse) return;
    const derived = deriveLevelAndSemesterFromCode(selectedCourse.code);
    if (derived) setSemester(derived.semester);
  }, [selectedCourse]);

  const filteredCourses = useMemo(() => {
    const q = courseQuery.trim().toLowerCase();
    const list = q
      ? courses.filter((c) =>
          c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q))
      : courses;
    return list.slice(0, 60);
  }, [courses, courseQuery]);

  const handlePageSelect = (index: number, file: File) => {
    setPages((prev) => {
      const updated = [...prev];
      updated[index] = file;
      return updated;
    });
  };

  const addPage = () => {
    if (pages.length < MAX_PAGES) {
      setPages((prev) => [...prev, null]);
    }
  };

  const removePage = (index: number) => {
    if (index === 0) {
      setPages((prev) => [null, ...prev.slice(1)]);
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setCourseId("");
    setCourseQuery("");
    setYear(new Date().getFullYear().toString());
    setSemester("first");
    setExamType("examination");
    setPages([null]);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!firstPage || !courseId) {
      setMessage("Select a course and at least one page");
      toast.warning("Select a course and at least one page");
      return;
    }
    setLoading(true);

    try {
      const questionId = crypto.randomUUID();
      const uploadedPages: { pageNumber: number; filePath: string; fileType: string }[] = [];
      const filledPages = pages.filter((p): p is File => p !== null);

      for (let i = 0; i < filledPages.length; i++) {
        const file = filledPages[i];
        const ext = file.name.split(".").pop();
        const fileType = file.type === "application/pdf" ? "pdf" : "image";
        const filePath = `approved/${questionId}/page-${i + 1}.${ext}`;

        setProgress(`Uploading page ${i + 1} of ${filledPages.length}...`);
        const { error: uploadError } = await supabase.storage
          .from("approved")
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: "3600",
          });
        if (uploadError) throw new Error("Upload failed: " + uploadError.message);
        uploadedPages.push({ pageNumber: i + 1, filePath, fileType });
      }

      if (uploadedPages.length === 0) {
        throw new Error("No pages were uploaded");
      }

      setProgress("Saving question...");
      const formData = new FormData();
      formData.set("course_id", courseId);
      formData.set("year", year);
      formData.set("semester", semester);
      formData.set("exam_type", examType);
      formData.set("file_url", uploadedPages[0].filePath);
      formData.set("file_type", uploadedPages[0].fileType);
      formData.set("question_id", questionId);

      const res = await fetch("/api/admin?action=admin-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish question");

      const pagesToInsert = uploadedPages.map((p) => ({
        question_id: questionId,
        page_number: p.pageNumber,
        file_url: p.filePath,
        file_type: p.fileType,
      }));

      const pagesRes = await fetch("/api/admin?action=insert-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: pagesToInsert }),
      });
      if (!pagesRes.ok) {
        const pagesData = await pagesRes.json();
        logger.error({ event: "admin.insert_pages_failed", message: "Failed to save pages", userId: "unknown", metadata: { error: pagesData.error } });
      }

      setMessage("Question published successfully");
      toast.success("Question published successfully");
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error uploading";
      setMessage(msg);
      toast.error(msg);
    }
    setProgress("");
    setLoading(false);
  }

  const inputCls =
    "mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Course picker */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Course</h3>
        {showAddCourse ? (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <CreateCourseForm
              postUrl="/api/admin?action=create-course"
              programmes={programmes}
              onSuccess={(newCourse) => {
                const c = newCourse as Course;
                setCourses((prev) => [...prev, c].sort((a, b) => a.code.localeCompare(b.code)));
                setCourseId(c.id);
                setShowAddCourse(false);
                toast.success("Course created");
              }}
              onCancel={() => setShowAddCourse(false)}
            />
          </div>
        ) : selectedCourse ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50/50 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{selectedCourse.code}</span>
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                  Lvl {selectedCourse.level}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  selectedCourse.scope === "shared" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {selectedCourse.scope}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-gray-600">{selectedCourse.title}</p>
            </div>
            <button
              type="button"
              onClick={() => { setCourseId(""); setCoursePickerOpen(true); }}
              className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative mt-3">
            <svg className="pointer-events-none absolute left-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={courseQuery}
              onChange={(e) => { setCourseQuery(e.target.value); setCoursePickerOpen(true); }}
              onFocus={() => setCoursePickerOpen(true)}
              placeholder="Search by course code or title..."
              className="block w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
            />
            {coursePickerOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setCoursePickerOpen(false)} />
                <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {filteredCourses.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">No courses match</p>
                  ) : (
                    filteredCourses.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCourseId(c.id);
                          setCourseQuery("");
                          setCoursePickerOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-primary-50"
                      >
                        <span className="font-medium text-gray-900">{c.code}</span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{c.level}L</span>
                        <span className="min-w-0 flex-1 truncate text-gray-500">{c.title}</span>
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowAddCourse(true); setCoursePickerOpen(false); }}
                    className="w-full border-t border-gray-100 px-4 py-2.5 text-left text-sm font-medium text-primary-600 hover:bg-primary-50"
                  >
                    + Add new course...
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Session details */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Question details</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Session</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} required className={inputCls}>
                {Array.from(
                  { length: 10 },
                  (_, i) => (new Date().getFullYear() - i).toString(),
                ).map((y) => (
                  <option key={y} value={y}>{formatSession(Number(y))}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)} className={inputCls}>
                <option value="first">First</option>
                <option value="second">Second</option>
              </select>
              {selectedCourse && deriveLevelAndSemesterFromCode(selectedCourse.code) && (
                <p className="mt-1 text-[11px] text-gray-400">Auto-set from course code</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Exam Type</label>
              <select value={examType} onChange={(e) => setExamType(e.target.value)} className={inputCls}>
                <option value="examination">Examination</option>
                <option value="mid_semester">Mid Semester</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pages */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Question pages <span className="text-danger-500">*</span>
            </h3>
            <span className="text-xs text-gray-400">{pages.filter(Boolean).length}/{MAX_PAGES} added</span>
          </div>
          {pages.length > 1 && (
            <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              Page 1 is used for records — additional pages are stored and shown alongside it.
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pages.map((file, index) => (
              <PageTile
                key={index}
                index={index}
                file={file}
                onSelect={(f) => handlePageSelect(index, f)}
                onRemove={() => removePage(index)}
              />
            ))}
            {pages.length < MAX_PAGES && (
              <button
                type="button"
                onClick={addPage}
                className="flex min-h-[104px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-primary-400 hover:text-primary-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="mt-1 text-xs font-medium">Add page</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary + submit */}
        {selectedCourse && firstPage && (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="truncate">
              Publishing <strong>{selectedCourse.code}</strong> · {formatSession(Number(year))} · {semester === "second" ? "Second" : "First"} Semester · {pages.filter(Boolean).length} page{pages.filter(Boolean).length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50">
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {progress || "Uploading..."}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Publish Question
            </>
          )}
        </button>

        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm ${
            message === "Question published successfully"
              ? "border border-success-200 bg-success-50 text-success-700"
              : "border border-danger-200 bg-danger-50 text-danger-700"
          }`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
