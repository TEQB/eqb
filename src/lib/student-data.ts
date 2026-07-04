import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createServiceClient } from "@/lib/supabase/service";

type Client = SupabaseClient<Database>;

export type StudentCourseScope = "departmental" | "shared" | "general";

export interface StudentProgramme {
  id: string;
  name: string;
  available_levels: number[];
}

export interface StudentProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  matric_number: string;
  programme_id: string;
  current_level: number;
  role: string;
  last_upload_at: string | null;
  is_locked: boolean;
  created_at: string;
  programme: StudentProgramme | null;
}

export interface StudentCourse {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: StudentCourseScope;
  programme_id: string;
}

export interface StudentCourseGroups {
  allCourses: StudentCourse[];
  generalCourses: StudentCourse[];
  programmeCourses: StudentCourse[];
}

export async function loadStudentProfile(
  supabase: Client,
  userId: string,
): Promise<StudentProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*, programme:programme_id(id, name, available_levels)")
    .eq("auth_user_id", userId)
    .single();

  return (data as unknown as StudentProfile | null) ?? null;
}

export async function loadCoursesForProgramme(
  supabase: Client,
  programmeId: string,
): Promise<StudentCourse[]> {
  const [rawOwnCourses, rawProgrammeLinks] = await Promise.all([
    supabase
      .from("courses")
      .select("id, code, title, level, scope, programme_id")
      .or(`scope.eq.general,programme_id.eq.${programmeId}`)
      .order("level"),
    supabase
      .from("programme_courses")
      .select("course_id, course:course_id(id, code, title, level, scope, programme_id)")
      .eq("programme_id", programmeId),
  ]);

  const ownCourses = rawOwnCourses.data as unknown as StudentCourse[] | null;
  const programmeLinks = rawProgrammeLinks.data as unknown as Array<{
    course_id: string;
    course: StudentCourse;
  }> | null;

  const linkedIds = new Set(programmeLinks?.map((l) => l.course_id) || []);
  return [
    ...(ownCourses || []).filter((c) => !linkedIds.has(c.id)),
    ...(programmeLinks || []).map((l) => l.course),
  ].sort((a, b) => a.level - b.level);
}

export async function loadStudentCourseGroups(
  supabase: Client,
  programmeId: string,
): Promise<StudentCourseGroups> {
  const allCourses = await loadCoursesForProgramme(supabase, programmeId);

  return {
    allCourses,
    generalCourses: allCourses.filter((c) => c.scope === "general"),
    programmeCourses: allCourses.filter((c) => c.scope !== "general"),
  };
}

export async function loadUploadObligationDays(
  supabase: Client,
  fallbackDays = 90,
): Promise<number> {
  const { data } = await supabase
    .from("platform_settings")
    .select("upload_obligation_days")
    .single();

  return (data as unknown as { upload_obligation_days: number } | null)
    ?.upload_obligation_days ?? fallbackDays;
}

export async function loadJoinableSharedCourses(
  programmeId: string,
): Promise<StudentCourse[]> {
  const service = createServiceClient();
  const [{ data: sharedCourses }, { data: linkedRows }] = await Promise.all([
    service
      .from("courses")
      .select("id, code, title, level, scope, programme_id")
      .eq("scope", "shared"),
    service
      .from("programme_courses")
      .select("course_id")
      .eq("programme_id", programmeId),
  ]);

  const linkedIds = new Set(
    (linkedRows as unknown as Array<{ course_id: string }> | null)?.map((r) => r.course_id) ?? [],
  );

  return (
    (sharedCourses as unknown as StudentCourse[] | null) ?? []
  ).filter(
    (c) => c.programme_id !== programmeId && !linkedIds.has(c.id),
  );
}

export async function loadLinkedSharedCourseIds(
  programmeId: string,
): Promise<Set<string>> {
  const service = createServiceClient();
  const { data: linkedRows } = await service
    .from("programme_courses")
    .select("course_id, course:course_id!inner(scope, programme_id)")
    .eq("programme_id", programmeId);

  const links = linkedRows as unknown as Array<{
    course_id: string;
    course: { scope: string; programme_id: string };
  }> | null;

  return new Set(
    (links || [])
      .filter((l) => l.course.scope === "shared" && l.course.programme_id !== programmeId)
      .map((l) => l.course_id),
  );
}

export async function loadPublishedQuestionCounts(
  supabase: Client,
  courseIds: string[],
): Promise<Record<string, number>> {
  if (courseIds.length === 0) return {};

  const { data } = await supabase
    .from("past_questions")
    .select("course_id")
    .in("course_id", courseIds)
    .eq("status", "published");

  const counts: Record<string, number> = {};
  for (const row of (data || []) as { course_id: string }[]) {
    counts[row.course_id] = (counts[row.course_id] || 0) + 1;
  }
  return counts;
}

export interface PendingSharedRequest {
  id: string;
  course_id: string;
  programme_id: string;
  requester_id: string;
  action_type: "join" | "leave";
  created_at: string;
  course: {
    code: string;
    title: string;
    level: number;
  };
  requester: {
    full_name: string;
  };
  voteCounts: {
    approve: number;
    reject: number;
  };
  userVoted: boolean;
  userVote: string | null;
}

export async function loadPendingSharedRequests(
  programmeId: string,
  profileId: string,
): Promise<PendingSharedRequest[]> {
  const service = createServiceClient();
  const { data: raw } = await (service as any)
    .from("shared_course_requests")
    .select("*, course:course_id!inner(code, title, level), requester:requester_id!inner(full_name)")
    .eq("programme_id", programmeId)
    .eq("status", "pending");

  const rows = (raw ?? []) as Array<{
    id: string;
    course_id: string;
    programme_id: string;
    requester_id: string;
    action_type: string;
    created_at: string;
    course: { code: string; title: string; level: number };
    requester: { full_name: string };
  }>;

  if (rows.length === 0) return [];

  const requestIds = rows.map((r) => r.id);

  const { data: voteRaw } = await (service as any)
    .from("shared_course_votes")
    .select("request_id, vote, voter_id")
    .in("request_id", requestIds);

  const votes = (voteRaw ?? []) as Array<{
    request_id: string;
    vote: string;
    voter_id: string;
  }>;

  return rows.map((r) => {
    const requestVotes = votes.filter((v) => v.request_id === r.id);
    const approve = requestVotes.filter((v) => v.vote === "approve").length;
    const reject = requestVotes.filter((v) => v.vote === "reject").length;
    const userVote = requestVotes.find((v) => v.voter_id === profileId);
    return {
      id: r.id,
      course_id: r.course_id,
      programme_id: r.programme_id,
      requester_id: r.requester_id,
      action_type: r.action_type as "join" | "leave",
      created_at: r.created_at,
      course: r.course,
      requester: r.requester,
      voteCounts: { approve, reject },
      userVoted: !!userVote,
      userVote: userVote?.vote ?? null,
    };
  });
}

export async function loadStudentFeedbackCount(
  supabase: Client,
  profileId: string,
): Promise<number> {
  const { count } = await supabase
    .from("feedback_messages" as never)
    .select("id", { count: "exact", head: true })
    .eq("profile_id" as never, profileId);

  return count ?? 0;
}

export async function loadStudentFeedbackMessages(
  supabase: Client,
  profileId: string,
): Promise<Array<{ id: string; message: string; created_at: string | null }>> {
  const { data } = await supabase
    .from("feedback_messages" as never)
    .select("id, message, created_at")
    .eq("profile_id" as never, profileId)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    (data as unknown as Array<{
      id: string;
      message: string;
      created_at: string | null;
    }>) ?? []
  );
}
