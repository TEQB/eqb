import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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
  department_id: string;
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
  department_id: string;
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
    .select("*, programme:department_id(id, name, available_levels)")
    .eq("auth_user_id", userId)
    .single();

  return (data as unknown as StudentProfile | null) ?? null;
}

export async function loadStudentCourseGroups(
  supabase: Client,
  programmeId: string,
): Promise<StudentCourseGroups> {
  const [rawOwnCourses, rawDeptLinks] = await Promise.all([
    supabase
      .from("courses")
      .select("id, code, title, level, scope, department_id")
      .or(`scope.eq.general,department_id.eq.${programmeId}`)
      .order("level"),
    supabase
      .from("department_courses")
      .select("course_id, course:course_id(id, code, title, level, scope, department_id)")
      .eq("department_id", programmeId),
  ]);

  const ownCourses = rawOwnCourses.data as unknown as StudentCourse[] | null;
  const deptLinks = rawDeptLinks.data as unknown as Array<{
    course_id: string;
    course: StudentCourse;
  }> | null;

  const linkedIds = new Set(deptLinks?.map((l) => l.course_id) || []);
  const allCourses = [
    ...(ownCourses || []).filter((c) => !linkedIds.has(c.id)),
    ...(deptLinks || []).map((l) => l.course),
  ].sort((a, b) => a.level - b.level);

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
