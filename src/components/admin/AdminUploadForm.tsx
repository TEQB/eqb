"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { formatSession } from "@/lib/utils";
import { FileDropzone } from "@/components/upload/FileDropzone";
import { logger } from "@/lib/logger";

interface Faculty {
  id: string;
  name: string;
  slug: string;
}

interface Programme {
  id: string;
  name: string;
  faculty_id: string;
  faculty_name: string;
}

const MAX_PAGES = 6;

export function AdminUploadForm({ secret: _secret }: { secret: string }) {
  const supabase = createClient();
  const [courses, setCourses] = useState<{ id: string; code: string; title: string; level: number; scope: string }[]>([]);
  const [courseId, setCourseId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [semester, setSemester] = useState("first");
  const [examType, setExamType] = useState("examination");
  const [level, setLevel] = useState("100");
  const [pages, setPages] = useState<(File | null)[]>([null]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newProgrammeId, setNewProgrammeId] = useState("");
  const [newLevel, setNewLevel] = useState("100");
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [newCourseError, setNewCourseError] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);

  const [scope, setScope] = useState<"departmental" | "shared" | "general">("departmental");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");

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
    fetch("/api/admin?action=faculties")
      .then((r) => r.json())
      .then((data) => {
        if (data.faculties) setFaculties(data.faculties);
      });
  }, []);

  const firstPage = pages[0];
  const selectedCourse = courses.find((c) => c.id === courseId);

  const handlePageSelect = (index: number, file: File | null) => {
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
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!firstPage || !courseId) {
      setMessage("Select a course and at least one page");
      toast.warning("Select a course and at least one page");
      return;
    }
    if (scope === "departmental" && !selectedProgrammeId) {
      setMessage("Select a programme for departmental scope");
      toast.warning("Select a programme for departmental scope");
      return;
    }
    if (scope === "shared" && !selectedFacultyId) {
      setMessage("Select a faculty for shared scope");
      toast.warning("Select a faculty for shared scope");
      return;
    }
    setLoading(true);

    try {
      const questionId = crypto.randomUUID();
      const uploadedPages: { pageNumber: number; filePath: string; fileType: string }[] = [];

      for (let i = 0; i < pages.length; i++) {
        const file = pages[i];
        if (!file) continue;
        const ext = file.name.split(".").pop();
        const fileType = file.type === "application/pdf" ? "pdf" : "image";
        const filePath = `approved/${questionId}/page-${i + 1}.${ext}`;

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

      const formData = new FormData();
      formData.set("course_id", courseId);
      formData.set("year", year);
      formData.set("semester", semester);
      formData.set("exam_type", examType);
      formData.set("level", level);
      formData.set("file_url", uploadedPages[0].filePath);
      formData.set("file_type", uploadedPages[0].fileType);
      formData.set("question_id", questionId);
      formData.set("scope", scope);
      if (scope === "departmental") {
        formData.set("department_id", selectedProgrammeId);
      } else if (scope === "shared") {
        formData.set("faculty_id", selectedFacultyId);
      }

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
      setPages([null]);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error uploading";
      setMessage(msg);
      toast.error(msg);
    }
    setLoading(false);
  }

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    setNewCourseError("");
    if (!newCode.trim() || !newTitle.trim() || !newProgrammeId) {
      setNewCourseError("All fields are required");
      toast.warning("All fields are required");
      return;
    }
    setCreatingCourse(true);
    try {
      const res = await fetch("/api/admin?action=create-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim(),
          title: newTitle.trim(),
          programme_id: newProgrammeId,
          level: parseInt(newLevel),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create course");
      const newCourse = data.course;
      setCourses((prev) => [...prev, newCourse].sort((a, b) => a.code.localeCompare(b.code)));
      setCourseId(newCourse.id);
      setShowAddCourse(false);
      setNewCode("");
      setNewTitle("");
      setNewProgrammeId("");
      setNewLevel("100");
      toast.success("Course created");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error creating course";
      setNewCourseError(msg);
      toast.error(msg);
    }
    setCreatingCourse(false);
  }

  const filteredProgrammes = scope === "departmental"
    ? programmes
    : scope === "shared"
      ? programmes.filter((p) => p.faculty_id === selectedFacultyId)
      : [];

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700">Course</label>
        {showAddCourse ? (
          <div className="mt-1 space-y-3">
            <input type="text" placeholder="Course Code (e.g. CSC 401)" value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
            <input type="text" placeholder="Course Name (e.g. Operating Systems)" value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100" />
            <select value={newProgrammeId} onChange={(e) => setNewProgrammeId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
              <option value="">Select programme</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.faculty_name})</option>
              ))}
            </select>
            <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
              {[100, 200, 300, 400, 500].map((l) => (
                <option key={l} value={l}>{l} Level</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button type="button" onClick={handleCreateCourse} disabled={creatingCourse}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50">
                {creatingCourse ? "Creating..." : "Create Course"}
              </button>
              <button type="button" onClick={() => setShowAddCourse(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                Cancel
              </button>
            </div>
            {newCourseError && (
              <p className="text-sm text-danger-600">{newCourseError}</p>
            )}
          </div>
        ) : (
          <select value={courseId} onChange={(e) => {
            if (e.target.value === "__add_new__") {
              setShowAddCourse(true);
            } else {
              setCourseId(e.target.value);
            }
          }} required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
            ))}
            <option value="__add_new__">+ Add new course...</option>
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Scope</label>
        <select value={scope} onChange={(e) => {
          setScope(e.target.value as typeof scope);
          setSelectedFacultyId("");
          setSelectedProgrammeId("");
        }}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
          <option value="departmental">Departmental (only my programme)</option>
          <option value="shared">Shared (visible to other programmes in my faculty)</option>
          <option value="general">General (all students)</option>
        </select>
      </div>

      {scope === "shared" && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Faculty</label>
          <select value={selectedFacultyId} onChange={(e) => {
            setSelectedFacultyId(e.target.value);
            setSelectedProgrammeId("");
          }} required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
            <option value="">Select faculty</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}

      {scope === "departmental" && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Programme</label>
          <select value={selectedProgrammeId} onChange={(e) => setSelectedProgrammeId(e.target.value)} required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
            <option value="">Select programme</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Session</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
            {Array.from(
              { length: 10 },
              (_, i) => (new Date().getFullYear() - i).toString(),
            ).map((y) => (
              <option key={y} value={y}>
                {formatSession(Number(y))}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Level</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
            {[100, 200, 300, 400, 500, 600, 700].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Semester</label>
          <select value={semester} onChange={(e) => setSemester(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
            <option value="first">First</option>
            <option value="second">Second</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Exam Type</label>
          <select value={examType} onChange={(e) => setExamType(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
            <option value="examination">Examination</option>
            <option value="mid_semester">Mid Semester</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Pages <span className="text-danger-500">*</span>
        </label>
        {pages.map((file, index) => (
          <div key={index}>
            <FileDropzone file={file} onFileSelect={(f) => handlePageSelect(index, f)} />
            <p className="mt-1.5 text-xs text-gray-500 text-center">
              Page {index + 1}
              {index === 0 && <span className="text-danger-500"> (required)</span>}
              {index > 0 && pages.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePage(index)}
                  className="ml-2 text-danger-600 hover:text-danger-800 font-medium"
                >
                  Remove
                </button>
              )}
            </p>
            {index === 0 && pages.length > 1 && (
              <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                Only <strong>page 1</strong> is used for records. Additional pages are stored and displayed alongside it.
              </p>
            )}
          </div>
        ))}
        {pages.length < MAX_PAGES && (
          <button
            type="button"
            onClick={addPage}
            className="w-full rounded-md border-2 border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            + Add another page
          </button>
        )}
      </div>

      <button type="submit" disabled={loading}
        className="w-full rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50">
        {loading ? "Uploading..." : "Publish Question"}
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
  );
}