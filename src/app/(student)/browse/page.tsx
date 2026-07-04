import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaginatedCourseGrid } from "@/components/browse/PaginatedCourseGrid";
import { JoinSharedCourse } from "@/components/courses/JoinSharedCourse";
import { LeaveSharedCourse } from "@/components/courses/LeaveSharedCourse";
import { VoteButtons } from "@/components/courses/VoteButtons";
import {
  loadJoinableSharedCourses,
  loadLinkedSharedCourseIds,
  loadPendingSharedRequests,
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

  const [courseGroups, joinableSharedCourses, linkedSharedIds, pendingRequests] = await Promise.all([
    loadStudentCourseGroups(supabase, profile.programme_id),
    loadJoinableSharedCourses(profile.programme_id),
    loadLinkedSharedCourseIds(profile.programme_id),
    loadPendingSharedRequests(profile.programme_id, profile.id),
  ]);

  const pendingJoinCourseIds = new Set(
    pendingRequests.filter((r) => r.action_type === "join").map((r) => r.course_id),
  );
  const pendingLeaveCourseIds = new Set(
    pendingRequests.filter((r) => r.action_type === "leave").map((r) => r.course_id),
  );

  const questionCounts = await loadPublishedQuestionCounts(
    supabase,
    courseGroups.allCourses.map((c) => c.id),
  );

  let courses = courseGroups.allCourses.map((c) => ({
    ...c,
    questionCount: questionCounts[c.id] || 0,
  }));

  let joinable = joinableSharedCourses.filter((c) => !pendingJoinCourseIds.has(c.id));
  if (search) {
    courses = courses.filter(
      (c) =>
        c.code.toLowerCase().includes(search) ||
        c.title.toLowerCase().includes(search),
    );
    joinable = joinable.filter(
      (c) =>
        c.code.toLowerCase().includes(search) ||
        c.title.toLowerCase().includes(search),
    );
  }

  const programmeName = profile.programme?.name ?? "My programme";

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
        <PaginatedCourseGrid
          courses={courses}
          emptyMessage={search ? `No courses matching "${search}"` : "No courses available."}
        />
      </div>

      {linkedSharedIds.size > 0 && (() => {
        const linkedShared = courses.filter((c) => linkedSharedIds.has(c.id));
        if (linkedShared.length === 0) return null;
        return (
          <div className="space-y-4 rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-primary">Linked Shared Courses</h3>
            <p className="text-sm text-gray-500">
              Your programme is linked to these shared courses. Removal requires approval from your programme-mates.
            </p>
            <ul className="space-y-3">
              {linkedShared.map((course) => {
                const hasPendingLeave = pendingLeaveCourseIds.has(course.id);
                return (
                  <li
                    key={course.id}
                    className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-mono text-sm font-medium text-gray-900">{course.code}</p>
                      <p className="text-sm text-gray-600">{course.title}</p>
                      <p className="text-xs text-gray-400">Level {course.level}</p>
                    </div>
                    {hasPendingLeave ? (
                      <span className="text-xs text-amber-600 italic">Removal pending — awaiting votes</span>
                    ) : (
                      <LeaveSharedCourse
                        courseId={course.id}
                        courseCode={course.code}
                        programmeName={programmeName}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}

      {pendingRequests.length > 0 && (
        <div className="space-y-4 rounded-[1.75rem] border border-amber-200 bg-amber-50/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-amber-800">Pending Requests</h3>
          <p className="text-sm text-amber-700">
            These requests need approval from your programme-mates at the same level.
          </p>
          <ul className="space-y-3">
            {pendingRequests.map((req) => (
              <li
                key={req.id}
                className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-gray-900">
                    {req.action_type === "join" ? "Join" : "Remove"} {req.course.code}
                  </p>
                  <p className="text-sm text-gray-600">{req.course.title}</p>
                  <p className="text-xs text-gray-400">
                    Requested by {req.requester.full_name} · Level {req.course.level}
                    · {req.voteCounts.approve} approve · {req.voteCounts.reject} reject
                  </p>
                </div>
                {req.userVoted ? (
                  <span className="text-xs text-gray-500 italic">
                    You voted {req.userVote === "approve" ? "to approve" : "to reject"}
                  </span>
                ) : (
                  req.requester_id !== profile.id && (
                    <VoteButtons requestId={req.id} />
                  )
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {joinable.length > 0 && (
        <div className="space-y-4 rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-primary">Shared Courses You Can Join</h3>
          <p className="text-sm text-gray-500">
            These shared courses are not yet linked to {programmeName}.
          </p>
          <ul className="space-y-3">
            {joinable.map((course) => (
              <li
                key={course.id}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-gray-900">{course.code}</p>
                  <p className="text-sm text-gray-600">{course.title}</p>
                  <p className="text-xs text-gray-400">Level {course.level}</p>
                </div>
                <JoinSharedCourse
                  courseId={course.id}
                  courseCode={course.code}
                  programmeName={programmeName}
                  variant="inline"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
