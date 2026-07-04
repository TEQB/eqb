import { createServiceClient } from "@/lib/supabase/service";

type NotificationInput = {
  user_id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
};

export async function createNotification(input: NotificationInput) {
  const service = createServiceClient();
  const { error } = await (service as any).from("notifications").insert({
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    body: input.body || null,
    link: input.link || null,
    metadata: JSON.stringify(input.metadata || {}),
  });
  if (error) {
    console.error("Failed to create notification:", error.message);
  }
}

export async function notifyAdmins(input: Omit<NotificationInput, "user_id">) {
  const service = createServiceClient();
  const { data: raw } = await service
    .from("profiles")
    .select("id")
    .eq("role", "super_admin");
  const admins = (raw ?? []) as Array<{ id: string }>;
  for (const admin of admins) {
    await createNotification({ ...input, user_id: admin.id });
  }
}

export async function notifyCourseStudents(
  courseId: string,
  input: Omit<NotificationInput, "user_id">,
) {
  const service = createServiceClient();
  const { data: rawCourse } = await service
    .from("courses")
    .select("programme_id, scope")
    .eq("id", courseId)
    .single();
  const course = rawCourse as unknown as { programme_id: string | null; scope: string } | null;
  if (!course) return;

  let studentQuery = service
    .from("profiles")
    .select("id")
    .eq("role", "student");

  if (course.scope === "general") {
    // notify all students
  } else if (course.scope === "departmental" && course.programme_id) {
    studentQuery = studentQuery.eq("programme_id", course.programme_id);
  } else if (course.scope === "shared" && course.programme_id) {
    const { data: rawLinks } = await service
      .from("programme_courses")
      .select("programme_id")
      .eq("course_id", courseId);
    const linkedProgrammes = ((rawLinks ?? []) as Array<{ programme_id: string }>).map((l) => l.programme_id);
    const allProgrammeIds = [course.programme_id, ...linkedProgrammes];
    studentQuery = studentQuery.in("programme_id", allProgrammeIds);
  }

  const { data: rawStudents } = await studentQuery;
  const students = (rawStudents ?? []) as Array<{ id: string }>;
  for (const student of students) {
    await createNotification({ ...input, user_id: student.id });
  }
}
