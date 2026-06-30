"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
}

type UploadState = "idle" | "uploading" | "reviewing" | "rejected";

export function UploadForm({ courses: initialCourses }: { courses: Course[] }) {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const preSelectedCourseId = searchParams.get("courseId");

  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newLevel, setNewLevel] = useState("100");
  const [addingCourse, setAddingCourse] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<UploadData>({
    resolver: zodResolver(uploadSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      courseId: preSelectedCourseId || "",
      year: new Date().getFullYear(),
      semester: "first",
      examType: "examination",
    },
  });

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newTitle) return;
    setAddingCourse(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode, title: newTitle, level: newLevel }),
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
      toast.success("Course added");
    } catch {
      setError("Failed to add course");
      toast.error("Failed to add course");
    } finally {
      setAddingCourse(false);
    }
  };

  const onSubmit = useCallback(
    async (data: UploadData) => {
      if (!file) {
        setError("Please select a file");
        toast.warning("Please select a file first");
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

      const fileExt = file.name.split(".").pop();
      const fileId = crypto.randomUUID();
      const filePath = `pending/${fileId}.${fileExt}`;
      const course = courses.find((c) => c.id === data.courseId);
      if (!course) return;

      const { error: uploadError } = await supabase.storage
        .from("pending")
        .upload(filePath, file);

      if (uploadError) {
        setError("Upload failed. Please try again.");
        setUploadState("idle");
        toast.error("Upload failed. Please try again.");
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
    [file, supabase, courses],
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
      <FileDropzone file={file} onFileSelect={setFile} />

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
              <label className="block text-xs font-medium text-gray-700">Level</label>
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
          ? "Uploading file..."
          : uploadState === "reviewing"
            ? "AI is reviewing your upload..."
            : "Upload past question"}
      </button>
    </form>
  );
}
