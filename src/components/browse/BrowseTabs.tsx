"use client";

import { useState } from "react";
import Link from "next/link";
import { JoinSharedCourse } from "@/components/courses/JoinSharedCourse";
import { LeaveSharedCourse } from "@/components/courses/LeaveSharedCourse";
import { VoteButtons } from "@/components/courses/VoteButtons";
import { PaginatedCourseGrid } from "@/components/browse/PaginatedCourseGrid";
import { cn } from "@/lib/utils";

type Course = {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: "departmental" | "shared" | "general" | string;
  programme_id?: string;
  questionCount?: number;
  solutionCount?: number;
};

type PendingRequest = {
  id: string;
  action_type: string;
  course_id: string;
  requester_id: string;
  userVoted: boolean;
  userVote: string | null;
  voteCounts: { approve: number; reject: number };
  requester: { full_name: string };
  course: { code: string; title: string; level: number };
};

export function BrowseTabs({
  courses,
  linkedShared,
  joinable,
  pendingRequests,
  pendingJoinCourseIds,
  pendingLeaveCourseIds,
  linkedSharedIds,
  programmeName,
  profileId,
  search,
}: {
  courses: Course[];
  linkedShared: Course[];
  joinable: Course[];
  pendingRequests: PendingRequest[];
  pendingJoinCourseIds: Set<string>;
  pendingLeaveCourseIds: Set<string>;
  linkedSharedIds: Set<string>;
  programmeName: string;
  profileId: string;
  search?: string;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "linked" | "joinable">("all");

  const tabs = [
    { key: "all" as const, label: "All Courses", count: courses.length },
    { key: "linked" as const, label: "Linked Shared", count: linkedShared.length },
    { key: "joinable" as const, label: "Available to Join", count: joinable.length },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pending Requests (always visible if any) */}
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
                  req.requester_id !== profileId && (
                    <VoteButtons requestId={req.id} />
                  )
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "all" && (
        <div className="animate-fade-in-up">
          <PaginatedCourseGrid
            courses={courses}
            emptyMessage={search ? `No courses matching "${search}"` : "No courses available."}
          />
        </div>
      )}

      {activeTab === "linked" && (
        <div className="space-y-4 rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
          {linkedShared.length === 0 ? (
            <p className="text-sm text-gray-500">No linked shared courses.</p>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {activeTab === "joinable" && (
        <div className="space-y-4 rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
          {joinable.length === 0 ? (
            <p className="text-sm text-gray-500">No shared courses available to join.</p>
          ) : (
            <>
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
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/course/${course.id}`}
                        className="rounded-2xl border border-secondary/30 bg-transparent px-3 py-1.5 text-xs font-medium text-secondary transition-all duration-fast hover:bg-secondary/10 hover:text-primary"
                      >
                        View
                      </Link>
                      <JoinSharedCourse
                        courseId={course.id}
                        courseCode={course.code}
                        programmeName={programmeName}
                        variant="inline"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
