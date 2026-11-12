import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthProfile } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { canAccessCourse, notifyMemberJoined, type CourseScope } from "@/lib/studyGroups";
import { logger } from "@/lib/logger";

const joinSchema = z.object({
  invite_code: z.string().min(4).max(20),
});

export async function POST(req: NextRequest) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "student") return NextResponse.json({ error: "Students only" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }

  const service = createServiceClient();
  const inviteCode = parsed.data.invite_code.trim().toUpperCase();

  try {
    const { data: rawGroup } = await service
      .from("study_groups")
      .select("id, course_id, name, is_active, created_by")
      .eq("invite_code", inviteCode)
      .eq("is_active", true)
      .single();

    const group = rawGroup as unknown as { id: string; course_id: string; name: string; is_active: boolean; created_by: string } | null;
    if (!group) return NextResponse.json({ error: "Invalid or expired invite code" }, { status: 404 });

    const { data: existing } = await service
      .from("study_group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: "You are already a member of this group" }, { status: 400 });

    const { data: rawCourse } = await service
      .from("courses")
      .select("id, code, title, level, scope, programme_id")
      .eq("id", group.course_id)
      .single();
    const course = rawCourse as unknown as CourseScope | null;
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    if (!(await canAccessCourse(profile, course))) {
      return NextResponse.json({ error: "You are not eligible to join this group" }, { status: 403 });
    }

    const { error: insertError } = await service.from("study_group_members").insert({
      group_id: group.id,
      profile_id: profile.id,
      role: "member",
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await notifyMemberJoined(group.id, profile.id, profile.full_name || profile.matric_number || "A student");

    return NextResponse.json({ success: true, group_id: group.id, group_name: group.name });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "study_groups.join_failed", message: msg, userId: profile.id, metadata: { inviteCode } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
