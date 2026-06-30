"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { uploadSchema } from "@/lib/validations";
import { FileDropzone } from "./FileDropzone";
import { toast } from "@/components/ui/toaster";

type UploadData = z.infer<typeof uploadSchema>;

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: string;
}

type UploadState = "idle" | "uploading" | "reviewing" | "rejected";

const SCOPE_LABELS: Record<string, string> = {
  departmental: "Departmental",
  shared: "Shared",
  general: "General",
};

export function UploadForm({ courses: initialCourses, preselectedCourseId }: { courses: Course[]; preselectedCourseId?: string | null }) {
  const supabase = createClient();

  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [file, setFile] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newLevel, setNewLevel] = useState("100");
  const [newScope, setNewScope] = useState<"departmental" | "shared" | "general">("departmental");
  const [addingCourse, setAddingCourse] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<UploadData>({
    resolver: zodResolver(uploadSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      courseId: "",
      year: new Date().getFullYear(),
      semester: "first",
      examType: "examination",
    },
  });

  useEffect(() => {
    if (preselectedCourseId) {
      setValue("courseId", preselectedCourseId);
    }
  }, [preselectedCourseId, setValue]);

  const selectedCourseId = watch("courseId");
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newTitle) return;
    setAddingCourse(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode, title: newTitle, level: newLevel, scope: newScope }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add course");
        toast.error(data.error || "Failed to add course");
        return;
      }
      const created = data.course as Course;
      setCourses((prev) => [...prev, created]);
      setValue("courseId", created.id);
      setShowAddCourse(false);
      setNewCode("");
      setNewTitle("");
      setNewLevel("100");
      setNewScope("departmental");
      toast.success("Course added");
    } catch {
      setError("Failed to add course");
      toast.error("Failed to add course");
    } finally {
      setAddingCourse(false);
    }
  };

  const uploadFile = async (f: File, prefix: string): Promise<string> => {
    const ext = f.name.split(".").pop();
    const fileId = `${prefix}-${crypto.randomUUID()}`;
    const filePath = `pending/${fileId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("pending")
      .upload(filePath, f);
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    return filePath;
  };

  const onSubmit = useCallback(
    async (data: UploadData) => {
      if (!file) {
        setError("Please select a file for the front page");
        toast.warning("Please select a file for the front page");
        return;
      }
      setError("");
      setUploadState("uploading");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You need to sign in to upload");
        return;
      }

      const { data: rawProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();
      if (profileError) {
        setError("Profile error: " + profileError.message);
        setUploadState("idle");
        toast.error("Profile error: " + profileError.message);
        return;
      }
      const profile = rawProfile as unknown as { id: string } | null;
      if (!profile) {
        setError("Profile not found");
        setUploadState("idle");
        toast.error("Profile not found");
        return;
      }

      const course = courses.find((c) => c.id === data.courseId);
      if (!course) return;

      let filePath = "";
      let file2Path: string | null = null;

      try {
        filePath = await uploadFile(file, "front");
        if (file2) {
          file2Path = await uploadFile(file2, "back");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(msg);
        setUploadState("idle");
        toast.error(msg);
        return;
      }

      const questionId = crypto.randomUUID();

      const { error: insertError } = await supabase
        .from("past_questions")
        .insert({
          id: questionId,
          course_id: data.courseId,
          uploaded_by: profile.id,
          level: course.level,
          file_url: filePath,
          file_url_2: file2Path,
          file_type: file.type === "application/pdf" ? "pdf" : "image",
          year: data.year,
          semester: data.semester,
          exam_type: data.examType,
          status: "pending_review",
        } as never);

      if (insertError) {
        setError(insertError.message || "Failed to create question record.");
        setUploadState("idle");
        toast.error(insertError.message || "Failed to create question record.");
        return;
      }

      setUploadState("reviewing");

      const response = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          courseCode: course.code,
          courseName: course.title,
        }),
      });

      const result = await response.json();

      if (result.pass) {
        toast.success("Upload approved — opening the question...");
        window.location.href = `/question/${questionId}`;
      } else {
        setRejectionReason(result.reason || "Upload rejected");
        setUploadState("rejected");
        toast.error(result.reason || "Upload rejected by AI review");
      }
    },
    [file, file2, supabase, courses],
  );

  if (uploadState === "rejected") {
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50 p-8 text-center">
        <p className="text-sm font-medium text-danger-600">
          Upload rejected{rejectionReason ? ` — ${rejectionReason}` : ""}
        </p>
        <button
          type="button"
          onClick={() => {
            setUploadState("idle");
            setRejectionReason("");
            setFile(null);
            setFile2(null);
          }}
          className="mt-4 rounded-md bg-danger-600 px-4 py-2 text-sm font-medium text-white hover:bg-danger-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Front Page File */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Front Page <span className="text-danger-500">*</span>
        </label>
        <FileDropzone file={file} onFileSelect={setFile} />
      </div>

      {/* Back Page File (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Back Page <span className="text-gray-400 font-normal">(optional — if exam paper has two sides)</span>
        </label>
        <FileDropzone file={file2} onFileSelect={setFile2} />
        {file2 && (
          <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Only the <strong>front page</strong> is sent for AI review. The back page is stored as-is and displayed alongside it.
          </p>
        )}
      </div>

      {/* Course Select */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Course
        </label>
        <div className="mt-1 flex gap-2">
          <select
            id="courseId"
            {...register("courseId")}
            className="block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title}
                {c.scope !== "departmental" ? ` (${SCOPE_LABELS[c.scope] ?? c.scope})` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAddCourse(true)}
            className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add
          </button>
        </div>
        {selectedCourse && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              selectedCourse.scope === "general"
                ? "bg-purple-100 text-purple-800"
                : selectedCourse.scope === "shared"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-700"
            }`}>
              {SCOPE_LABELS[selectedCourse.scope] ?? selectedCourse.scope}
            </span>
            <span className="text-xs text-gray-400">
              {selectedCourse.level} Level
            </span>
          </div>
        )}
      </div>

      {showAddCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddCourse(false)}>
          <form
            onSubmit={handleAddCourse}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
          >
            <h4 className="text-sm font-semibold text-gray-900">Add New Course</h4>
            <div>
              <label className="block text-xs font-medium text-gray-700">Course Code</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                required
                placeholder="e.g. CSC101"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Course Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                placeholder="e.g. Introduction to Programming"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block">Level</label>
              <select
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              >
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
                <option value="500">500 Level</option>
                <option value="600">600 Level</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block">Scope</label>
              <select
                value={newScope}
                onChange={(e) => setNewScope(e.target.value as "departmental" | "shared" | "general")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              >
                <option value="departmental">Departmental (only your dept)</option>
                <option value="shared">Shared (visible to other depts)</option>
                <option value="general">General (all students)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addingCourse}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {addingCourse ? "Adding..." : "Add Course"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddCourse(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700">
            Year
          </label>
          <input
            id="year"
            type="number"
            {...register("year")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div>
          <label htmlFor="semester" className="block text-sm font-medium text-gray-700">
            Semester
          </label>
          <select
            id="semester"
            {...register("semester")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
          >
            <option value="first">First</option>
            <option value="second">Second</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="examType" className="block text-sm font-medium text-gray-700">
          Exam Type
        </label>
        <select
          id="examType"
          {...register("examType")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
        >
          <option value="examination">Examination</option>
          <option value="mid_semester">Mid Semester</option>
        </select>
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting || uploadState === "uploading" || uploadState === "reviewing"}
        className="w-full rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploadState === "uploading"
          ? "Uploading files..."
          : uploadState === "reviewing"
            ? "AI is reviewing your upload..."
            : "Upload past question"}
      </button>
    </form>
  );
}
export default UploadForm;