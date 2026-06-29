import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CourseGrid } from "@/components/browse/CourseGrid";
import {
  loadPublishedQuestionCounts,
  loadStudentCourseGroups,
  loadStudentProfile,
} from "@/lib/student-data";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { q?: string; level?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const profile = await loadStudentProfile(supabase, user.id);
  if (!profile) redirect("/login");

  const search = (searchParams.q || "").toLowerCase();

  const courseGroups = await loadStudentCourseGroups(
    supabase,
    profile.department_id,
  );
  const questionCounts = await loadPublishedQuestionCounts(
    supabase,
    courseGroups.allCourses.map((c) => c.id),
  );

  let courses = courseGroups.allCourses.map((c) => ({
    ...c,
    questionCount: questionCounts[c.id] || 0,
  }));

  if (search) {
    courses = courses.filter(
      (c) =>
        c.code.toLowerCase().includes(search) ||
        c.title.toLowerCase().includes(search),
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-down rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-primary">Browse Courses</h2>
        {search && (
          <p className="mt-1 text-sm text-gray-500">
            Results for &quot;{search}&quot;
          </p>
        )}
      </div>

      <div className="animate-fade-in-up">
        {courses.length > 0 ? (
          <CourseGrid
            courses={courses}
            emptyMessage={search ? `No courses matching "${search}"` : "No courses available."}
          />
        ) : (
          <div className="clay-surface p-8 text-center">
            <p className="text-gray-500">
              {search
                ? `No courses matching "${search}"`
                : "No courses available."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
