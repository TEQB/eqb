import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoadMoreQuestions } from "@/components/question/LoadMoreQuestions";
import { QuestionFilters } from "@/components/question/QuestionFilters";
import { LeaveSharedCourse } from "@/components/courses/LeaveSharedCourse";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { year?: string; semester?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [rawCourse, profileResult] = await Promise.all([
    supabase
      .from("courses")
      .select("*, programme:programme_id(name)")
      .eq("id", params.id)
      .single(),
    supabase
      .from("profiles")
      .select("programme_id, programme:programme_id(name)")
      .eq("auth_user_id", user.id)
      .single(),
  ]);
  const course = rawCourse.data as unknown as {
    id: string;
    code: string;
    title: string;
    level: number;
    scope: string;
    programme_id: string;
    programme: { name: string } | null;
  } | null;
  const profile = profileResult.data as unknown as {
    programme_id: string;
    programme: { name: string } | null;
  } | null;

  if (!course) {
    redirect("/dashboard");
  }

  const programmeName =
    typeof course.programme === "object" && course.programme !== null
      ? (course.programme as { name: string }).name
      : "";

  const studentProgrammeName =
    profile?.programme && typeof profile.programme === "object"
      ? (profile.programme as { name: string }).name
      : null;

  let isLinkedShared = false;
  if (course.scope === "shared" && profile?.programme_id && course.programme_id !== profile.programme_id) {
    const service = createServiceClient();
    const { data: link } = await service
      .from("programme_courses")
      .select("course_id")
      .eq("course_id", course.id)
      .eq("programme_id", profile.programme_id)
      .maybeSingle();
    isLinkedShared = !!link;
  }

  let questionsQuery = supabase
    .from("past_questions")
    .select("id, year, semester, exam_type, file_type, level, status, flag_count, created_at")
    .eq("course_id", params.id)
    .eq("status", "published")
    .order("year", { ascending: false });

  if (searchParams.year) {
    questionsQuery = questionsQuery.eq("year", parseInt(searchParams.year));
  }
  if (searchParams.semester) {
    questionsQuery = questionsQuery.eq("semester", searchParams.semester);
  }

  const { data: questions } = await questionsQuery;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-down">
        <p className="truncate text-xs text-gray-500 sm:text-sm">
          <Link href="/dashboard" className="transition-colors hover:text-secondary">
            Dashboard
          </Link>{" "}
          / <Link href="/browse" className="transition-colors hover:text-secondary">Browse</Link> / {programmeName || "Course"}
        </p>
        <h2 className="mt-1 break-words text-lg font-semibold text-primary sm:text-2xl">
          <span className="font-mono">{course.code}</span> — {course.title}
        </h2>
        <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-gray-500 sm:text-sm">
          <span>{programmeName}</span>
          <span>·</span>
          <span>Level {course.level}</span>
          <span>·</span>
          <span>
            {questions?.length || 0} past question{questions?.length !== 1 ? "s" : ""}
          </span>
        </p>
        {isLinkedShared && studentProgrammeName && (
          <div className="mt-3">
            <LeaveSharedCourse
              courseId={course.id}
              courseCode={course.code}
              programmeName={studentProgrammeName}
            />
          </div>
        )}
        <div className="mt-3">
          <Link
            href={`/study-groups/course/${params.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7A1030] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#5f0c26] sm:w-auto"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
            Study Groups
          </Link>
        </div>
      </div>

      <div className="animate-fade-in-up stagger-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <QuestionFilters
          year={searchParams.year}
          semester={searchParams.semester}
        />
        <Link
          href={`/upload?courseId=${params.id}`}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-white transition-all duration-normal hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-[0_16px_30px_rgba(122,16,48,0.2)] active:scale-[0.98] sm:ml-auto sm:w-auto"
        >
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Upload
        </Link>
      </div>

      <div className="animate-fade-in-up stagger-2">
        <LoadMoreQuestions
          initialQuestions={questions || []}
          courseId={params.id}
          year={searchParams.year}
          semester={searchParams.semester}
        />
      </div>

      <Link
        href={`/upload?courseId=${params.id}`}
        className="fixed bottom-20 right-4 z-40 rounded-full bg-primary p-3 text-white shadow-[0_18px_35px_rgba(122,16,48,0.22)] transition-all duration-normal hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-[0_22px_40px_rgba(122,16,48,0.26)] active:scale-95 lg:hidden"
        aria-label="Upload past question"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </div>
  );
}
