"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrowseTabs } from "@/components/browse/BrowseTabs";

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const search = (searchParams.get("q") || "").toLowerCase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    courses: any[];
    linkedShared: any[];
    joinable: any[];
    pendingRequests: any[];
    pendingJoinCourseIds: Set<string>;
    pendingLeaveCourseIds: Set<string>;
    linkedSharedIds: Set<string>;
    programmeName: string;
    profileId: string;
  } | null>(null);

  const load = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, programme_id, programme:programme_id(name)")
        .eq("auth_user_id", user.id)
        .single();

      if (!profile) {
        window.location.href = "/login";
        return;
      }

      const programmeId = (profile as any).programme_id;
      const profileId = (profile as any).id;
      const programmeName = (profile as any).programme?.name ?? "My programme";

      const [courseRes, joinableRes, linkedRes, pendingRes] = await Promise.all([
        fetch(`/api/browse/courses?programme_id=${programmeId}`),
        fetch(`/api/browse/joinable?programme_id=${programmeId}`),
        fetch(`/api/browse/linked?programme_id=${programmeId}`),
        fetch(`/api/browse/pending?programme_id=${programmeId}&profile_id=${profileId}`),
      ]);

      const [courseData, joinableData, linkedData, pendingData] = await Promise.all([
        courseRes.json(),
        joinableRes.json(),
        linkedRes.json(),
        pendingRes.json(),
      ]);

      const pendingJoinCourseIds = new Set<string>(
        (pendingData.requests || [])
          .filter((r: any) => r.action_type === "join")
          .map((r: any) => r.course_id as string),
      );
      const pendingLeaveCourseIds = new Set<string>(
        (pendingData.requests || [])
          .filter((r: any) => r.action_type === "leave")
          .map((r: any) => r.course_id as string),
      );

      let courses = courseData.courses || [];
      let joinable = (joinableData.courses || []).filter(
        (c: any) => !pendingJoinCourseIds.has(c.id),
      );

      if (search) {
        courses = courses.filter(
          (c: any) =>
            c.code.toLowerCase().includes(search) ||
            c.title.toLowerCase().includes(search),
        );
        joinable = joinable.filter(
          (c: any) =>
            c.code.toLowerCase().includes(search) ||
            c.title.toLowerCase().includes(search),
        );
      }

      const linkedSharedIds = new Set<string>(linkedData.courseIds || []);
      const linkedShared = courses.filter((c: any) => linkedSharedIds.has(c.id));

      setData({
        courses,
        linkedShared,
        joinable,
        pendingRequests: pendingData.requests || [],
        pendingJoinCourseIds,
        pendingLeaveCourseIds,
        linkedSharedIds,
        programmeName,
        profileId,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const supabase = createClient();
    const channel = supabase
      .channel("browse-courses")
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "programme_courses" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_course_requests" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [search]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5">
          <h2 className="text-xl font-semibold text-primary">Browse Courses</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 rounded-xl bg-gray-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5">
          <h2 className="text-xl font-semibold text-primary">Browse Courses</h2>
        </div>
        <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-5">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

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

      <BrowseTabs
        courses={data.courses}
        linkedShared={data.linkedShared}
        joinable={data.joinable}
        pendingRequests={data.pendingRequests}
        pendingJoinCourseIds={data.pendingJoinCourseIds}
        pendingLeaveCourseIds={data.pendingLeaveCourseIds}
        linkedSharedIds={data.linkedSharedIds}
        programmeName={data.programmeName}
        profileId={data.profileId}
        search={search}
      />
    </div>
  );
}
