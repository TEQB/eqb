import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CourseGrid } from "@/components/browse/CourseGrid";
import { LevelTabs } from "@/components/browse/LevelTabs";
import {
  loadPublishedQuestionCounts,
  loadStudentFeedbackCount,
  loadStudentCourseGroups,
  loadStudentProfile,
} from "@/lib/student-data";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { level?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const profile = await loadStudentProfile(supabase, user.id);
  if (!profile) redirect("/login");

  const courseGroups = await loadStudentCourseGroups(
    supabase,
    profile.department_id,
  );
  const questionCounts = await loadPublishedQuestionCounts(
    supabase,
    courseGroups.allCourses.map((c) => c.id),
  );
  const feedbackCount = await loadStudentFeedbackCount(supabase, profile.id);

  const withCount = <T extends { id: string }>(c: T) => ({
    ...c,
    questionCount: questionCounts[c.id] || 0,
  });

  const generalCourses = courseGroups.generalCourses.map(withCount) || [];
  const programmeCourses = courseGroups.programmeCourses.map(withCount) || [];
  const levels = profile.programme?.available_levels || [];

  const selectedLevel = searchParams.level
    ? parseInt(searchParams.level)
    : profile.current_level;

  const filteredCourses = programmeCourses.filter((c) => c.level === selectedLevel);

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-down flex flex-col gap-4 rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">{profile.programme?.name}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/feedback"
            className="inline-flex items-center justify-center rounded-2xl border border-secondary/25 bg-secondary/10 px-4 py-2.5 text-sm font-medium text-secondary transition-all duration-normal hover:-translate-y-0.5 hover:bg-secondary/15"
          >
            Feedback
            {feedbackCount > 0 && (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {feedbackCount > 9 ? "9+" : feedbackCount}
              </span>
            )}
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all duration-normal hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-[0_16px_30px_rgba(122,16,48,0.2)] active:translate-y-0"
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Upload
          </Link>
        </div>
      </div>

      <section className="animate-fade-in-up stagger-1">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
          General Courses
        </h3>
        <CourseGrid courses={generalCourses} />
      </section>

      <section className="animate-fade-in-up stagger-2">
        <div className="mb-4">
          <LevelTabs
            levels={levels}
            activeLevel={selectedLevel}
          />
        </div>
        <CourseGrid
          courses={filteredCourses}
          emptyMessage="No courses found for this level."
        />
      </section>

      <Link
        href="/upload"
        className="fixed bottom-20 right-4 z-40 rounded-full bg-primary p-3 text-white shadow-[0_18px_35px_rgba(122,16,48,0.22)] transition-all duration-normal hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-[0_22px_40px_rgba(122,16,48,0.26)] active:scale-95 lg:hidden"
        aria-label="Upload past question"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </div>
  );
}
