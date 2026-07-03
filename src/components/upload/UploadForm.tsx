"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { uploadSchema } from "@/lib/validations";
import { FileDropzone } from "./FileDropzone";
import { toast } from "@/components/ui/toaster";
import { formatSession, deriveLevelAndSemesterFromCode } from "@/lib/utils";
import { CreateCourseForm } from "@/components/courses/CreateCourseForm";
import { JoinSharedCourse } from "@/components/courses/JoinSharedCourse";

type UploadData = z.infer<typeof uploadSchema>;

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: string;
  programme_id?: string;
}

interface Programme {
  id: string;
  name: string;
  faculty_id: string;
  faculty_name: string;
}

type UploadState = "idle" | "uploading" | "reviewing" | "rejected";

const SCOPE_LABELS: Record<string, string> = {
  departmental: "Programme",
  shared: "Shared",
  general: "General",
};

const MAX_PAGES = 6;

export function UploadForm({
  courses: initialCourses,
  preselectedCourseId,
  programmes: initialProgrammes = [],
  currentProgrammeId = "",
  currentProgrammeName = "",
  joinableSharedCourses: initialJoinable = [],
}: {
  courses: Course[];
  preselectedCourseId?: string | null;
  programmes?: Programme[];
  currentProgrammeId?: string;
  currentProgrammeName?: string;
  joinableSharedCourses?: Course[];
}) {
  const supabase = createClient();

  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [programmes, setProgrammes] = useState<Programme[]>(initialProgrammes);
  const [joinableSharedCourses, setJoinableSharedCourses] = useState<Course[]>(initialJoinable);
  const [pages, setPages] = useState<(File | null)[]>([null]);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  const [showAddCourse, setShowAddCourse] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<UploadData>({
    resolver: zodResolver(uploadSchema) as any,
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

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  useEffect(() => {
    setJoinableSharedCourses(initialJoinable);
  }, [initialJoinable]);

  useEffect(() => {
    if (initialProgrammes.length > 0) setProgrammes(initialProgrammes);
  }, [initialProgrammes]);

  useEffect(() => {
    if (programmes.length > 0) return;
    let active = true;
    async function loadProgrammes() {
      const programmeRes = await fetch("/api/browse/programmes");
      const programmeData = await programmeRes.json();
      if (!active) return;
      if (programmeData.programmes) setProgrammes(programmeData.programmes);
    }
    loadProgrammes();
    return () => {
      active = false;
    };
  }, [programmes.length]);

  const selectedCourseId = watch("courseId");
  const selectedCourse =
    courses.find((c) => c.id === selectedCourseId) ||
    joinableSharedCourses.find((c) => c.id === selectedCourseId);
  const needsJoin =
    !!selectedCourse &&
    selectedCourse.scope === "shared" &&
    joinableSharedCourses.some((c) => c.id === selectedCourse.id);

  useEffect(() => {
    if (!selectedCourse) return;
    const derived = deriveLevelAndSemesterFromCode(selectedCourse.code);
    if (derived) setValue("semester", derived.semester);
  }, [selectedCourse, setValue]);

  const handleCourseJoined = (joinedCourseId: string) => {
    const joined = joinableSharedCourses.find((c) => c.id === joinedCourseId);
    if (joined) {
      setCourses((prev) => [...prev, joined].sort((a, b) => a.level - b.level));
      setJoinableSharedCourses((prev) => prev.filter((c) => c.id !== joinedCourseId));
    }
  };

  const uploadFile = async (f: File, questionId: string, pageNumber: number): Promise<string> => {
    const ext = f.name.split(".").pop();
    const filePath = `pending/${questionId}/page-${pageNumber}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("pending")
      .upload(filePath, f);
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    return filePath;
  };

  const onSubmit = useCallback(
    async (data: UploadData) => {
      const firstPage = pages[0];
      if (!firstPage) {
        setError("Please select a file for page 1");
        toast.warning("Please select a file for page 1");
        return;
      }
      if (needsJoin) {
        setError("Link your programme to this shared course before uploading");
        toast.warning("Link your programme to this shared course first");
        return;
      }
      setError("");
      setUploadState("uploading");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You need to sign in to upload");
        setUploadState("idle");
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
      if (!course) {
        setError("Please select a course");
        setUploadState("idle");
        return;
      }

      const questionId = crypto.randomUUID();

      const uploadedPages: { pageNumber: number; filePath: string; fileType: string }[] = [];

      try {
        uploadedPages.push({
          pageNumber: 1,
          filePath: await uploadFile(firstPage, questionId, 1),
          fileType: firstPage.type === "application/pdf" ? "pdf" : "image",
        });

        for (let i = 1; i < pages.length; i++) {
          const pageFile = pages[i];
          if (pageFile) {
            uploadedPages.push({
              pageNumber: i + 1,
              filePath: await uploadFile(pageFile, questionId, i + 1),
              fileType: pageFile.type === "application/pdf" ? "pdf" : "image",
            });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(msg);
        setUploadState("idle");
        toast.error(msg);
        return;
      }

      const { error: insertError } = await supabase
        .from("past_questions")
        .insert({
          id: questionId,
          course_id: data.courseId,
          uploaded_by: profile.id,
          level: course.level,
          file_url: uploadedPages[0].filePath,
          file_type: uploadedPages[0].fileType,
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

      const pagesToInsert = uploadedPages.map((p) => ({
        question_id: questionId,
        page_number: p.pageNumber,
        file_url: p.filePath,
        file_type: p.fileType,
      }));

      const { error: pagesInsertError } = await supabase
        .from("past_question_pages")
        .insert(pagesToInsert as never);

      if (pagesInsertError) {
        await supabase.from("past_questions").delete().eq("id", questionId);
        const pendingPaths = uploadedPages.map((p) => p.filePath);
        await supabase.storage.from("pending").remove(pendingPaths);
        setError("Failed to save pages. Please try again.");
        setUploadState("idle");
        toast.error("Failed to save pages. Please try again.");
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
    [pages, supabase, courses, needsJoin],
  );

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
            setPages([null]);
          }}
          className="mt-4 rounded-md bg-danger-600 px-4 py-2 text-sm font-medium text-white hover:bg-danger-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
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
                  Only <strong>page 1</strong> is sent for AI review. Additional pages are stored as-is and displayed alongside it.
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
              {joinableSharedCourses.length > 0 && (
                <optgroup label="Shared courses you can join">
                  {joinableSharedCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title} (join required)
                    </option>
                  ))}
                </optgroup>
              )}
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
            <div className="mt-1.5 space-y-2">
              <div className="flex items-center gap-2">
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
              {needsJoin && currentProgrammeName && (
                <JoinSharedCourse
                  courseId={selectedCourse.id}
                  courseCode={selectedCourse.code}
                  programmeName={currentProgrammeName}
                  onJoined={handleCourseJoined}
                />
              )}
              {selectedCourse.scope === "departmental" &&
                selectedCourse.programme_id &&
                selectedCourse.programme_id !== currentProgrammeId && (
                  // TODO: escalate to admin — programme-specific course owned by another programme
                  <p className="text-xs text-amber-700">
                    This course is programme-specific to another programme. Contact an admin to request access.
                  </p>
                )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700">
              Session
            </label>
            <select
              id="year"
              {...register("year")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
            >
              {Array.from(
                { length: 10 },
                (_, i) => new Date().getFullYear() - i,
              ).map((y) => (
                <option key={y} value={y}>
                  {formatSession(y)}
                </option>
              ))}
            </select>
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
          disabled={isSubmitting || uploadState === "uploading" || uploadState === "reviewing" || needsJoin}
          className="w-full rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadState === "uploading"
            ? "Uploading files..."
            : uploadState === "reviewing"
              ? "AI is reviewing your upload..."
              : "Upload past question"}
        </button>
      </form>

      {showAddCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddCourse(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
          >
            <CreateCourseForm
              postUrl="/api/courses"
              programmes={programmes}
              onSuccess={(created) => {
                setCourses((prev) => [...prev, created]);
                setValue("courseId", created.id);
                setShowAddCourse(false);
                toast.success("Course added");
              }}
              onCancel={() => setShowAddCourse(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
export default UploadForm;
