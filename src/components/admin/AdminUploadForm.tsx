"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { formatSession } from "@/lib/utils";

export function AdminUploadForm({ secret: _secret }: { secret: string }) {
  const supabase = createClient();
  const [courses, setCourses] = useState<{ id: string; code: string; title: string; level: number }[]>([]);
  const [courseId, setCourseId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [semester, setSemester] = useState("first");
  const [examType, setExamType] = useState("examination");
  const [level, setLevel] = useState("100");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newProgrammeId, setNewProgrammeId] = useState("");
  const [newLevel, setNewLevel] = useState("100");
  const [programmes, setProgrammes] = useState<{ id: string; name: string }[]>([]);
  const [newCourseError, setNewCourseError] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!file || !courseId) {
      setMessage("Select a course and file");
      toast.warning("Select a course and file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("File must be under 10MB");
      toast.warning("File must be under 10MB");
      return;
    }
    setLoading(true);

    try {
      const fileType = file.type === "application/pdf" ? "pdf" : "image";
      const ext = fileType === "pdf" ? "pdf" : "jpg";
      const fileName = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("approved")
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: "3600",
        });
      if (uploadError) throw new Error("Upload failed: " + uploadError.message);

      const formData = new FormData();
      formData.set("course_id", courseId);
      formData.set("year", year);
      formData.set("semester", semester);
      formData.set("exam_type", examType);
      formData.set("level", level);
      formData.set("file_url", fileName);
      formData.set("file_type", fileType);

      const res = await fetch("/api/admin?action=admin-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish question");

      setMessage("Question published successfully");
      toast.success("Question published successfully");
      setFile(null);
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
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100">
              {[100, 200, 300, 400, 500].map((l) => (
                <option key={l} value={l}>{l}</option>
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

      <div>
        <label className="block text-sm font-medium text-gray-700">File (PDF or Image, max 10MB)</label>
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
        />
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
