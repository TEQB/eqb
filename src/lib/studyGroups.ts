import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/notifications";
import type { AuthProfile } from "@/lib/apiAuth";

export const MAX_GROUPS_PER_COURSE = 2;

export interface CourseScope {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: string;
  programme_id: string | null;
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Whether a student may view/join groups for this course (mirrors browse access). */
export async function canAccessCourse(profile: AuthProfile, course: CourseScope): Promise<boolean> {
  if (course.scope === "general") return true;
  if (course.scope === "departmental" || course.scope === "shared") {
    if (course.programme_id === profile.programme_id) return true;
    if (course.scope === "shared") {
      const service = createServiceClient();
      const { data } = await service
        .from("programme_courses")
        .select("course_id")
        .eq("programme_id", profile.programme_id)
        .eq("course_id", course.id)
        .maybeSingle();
      return !!data;
    }
  }
  return false;
}

/**
 * Student profile ids eligible to be notified about a new group for this course:
 * students whose programme matches the course scope AND who are at the course level.
 */
export async function getEligibleStudentIds(course: CourseScope): Promise<string[]> {
  const service = createServiceClient();

  let programmeIds: string[] = [];
  if (course.scope === "general") {
    programmeIds = []; // all programmes
  } else if (course.scope === "departmental" && course.programme_id) {
    programmeIds = [course.programme_id];
  } else if (course.scope === "shared" && course.programme_id) {
    const { data: links } = await service
      .from("programme_courses")
      .select("programme_id")
      .eq("course_id", course.id);
    programmeIds = Array.from(
      new Set([course.programme_id, ...((links ?? []) as Array<{ programme_id: string }>).map((l) => l.programme_id)]),
    );
  } else {
    return [];
  }

  let query = service
    .from("profiles")
    .select("id")
    .eq("role", "student")
    .eq("current_level", course.level);

  if (programmeIds.length > 0) {
    query = query.in("programme_id", programmeIds);
  }

  const { data } = await query;
  return ((data ?? []) as Array<{ id: string }>).map((p) => p.id);
}

export async function notifyGroupCreated(
  course: CourseScope,
  groupName: string,
  groupId: string,
  excludeProfileId?: string,
) {
  const studentIds = await getEligibleStudentIds(course);
  for (const userId of studentIds) {
    if (excludeProfileId && userId === excludeProfileId) continue;
    await createNotification({
      user_id: userId,
      type: "study_group_created",
      title: `New study group: ${groupName}`,
      body: `${course.code} — ${course.title}. Tap to join the conversation.`,
      link: "/study-groups",
      metadata: { groupId, courseId: course.id, courseCode: course.code },
    });
  }
}

export async function notifyMemberJoined(
  groupId: string,
  memberProfileId: string,
  memberName: string,
) {
  const service = createServiceClient();
  const { data: admins } = await service
    .from("study_group_members")
    .select("profile_id")
    .eq("group_id", groupId)
    .eq("role", "admin");

  for (const admin of (admins ?? []) as Array<{ profile_id: string }>) {
    if (admin.profile_id === memberProfileId) continue;
    await createNotification({
      user_id: admin.profile_id,
      type: "study_group_member_joined",
      title: `${memberName} joined your study group`,
      body: "A new member joined the group chat.",
      link: `/study-groups/${groupId}`,
      metadata: { groupId, memberProfileId },
    });
  }
}
