import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoadMoreQuestions } from "@/components/question/LoadMoreQuestions";
import { QuestionFilters } from "@/components/question/QuestionFilters";

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

  const { data: rawCourse } = await supabase
    .from("courses")
    .select("*, programme:department_id(name)")
    .eq("id", params.id)
    .single();
  const course = rawCourse as unknown as {
    id: string;
    code: string;
    title: string;
    level: number;
    scope: string;
    department_id: string;
    programme: { name: string } | null;
  } | null;

  if (!course) {
    redirect("/dashboard");
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

  const programmeName =
    typeof course.programme === "object" && course.programme !== null
      ? (course.programme as { name: string }).name
      : "";

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-down">
        <p className="text-sm text-gray-500">
          <Link href="/dashboard" className="transition-colors hover:text-secondary">
            Dashboard
          </Link>{" "}
          / {programmeName}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-primary">
          <span className="font-mono">{course.code}</span> — {course.title}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {programmeName} · Level {course.level} ·{" "}
          {questions?.length || 0} past question
          {questions?.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="animate-fade-in-up stagger-1 flex items-center gap-4">
        <QuestionFilters
          year={searchParams.year}
          semester={searchParams.semester}
        />
        <Link
          href={`/upload?courseId=${params.id}`}
          className="ml-auto inline-flex items-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-white transition-all duration-normal hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-[0_16px_30px_rgba(122,16,48,0.2)] active:scale-[0.98]"
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
