import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

const uuidSchema = z.string().uuid();

async function getEligibleVoters(
  programmeId: string,
  courseLevel: number,
  excludeProfileId: string,
): Promise<Array<{ id: string; full_name: string }>> {
  const service = createServiceClient();
  const { data: raw } = await service
    .from("profiles")
    .select("id, full_name")
    .eq("programme_id", programmeId)
    .eq("current_level", courseLevel)
    .eq("role", "student")
    .neq("id", excludeProfileId);
  return (raw ?? []) as Array<{ id: string; full_name: string }>;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const parsedId = uuidSchema.safeParse(params.id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
    }
    const courseId = parsedId.data;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("id, programme_id, role, full_name, programme:programme_id(name)")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as {
      id: string;
      programme_id: string;
      role: string;
      full_name: string;
      programme: { name: string } | null;
    } | null;

    if (!profile?.programme_id) {
      return NextResponse.json({ error: "Your profile does not have a programme assigned" }, { status: 400 });
    }
    if (profile.role !== "student") {
      return NextResponse.json({ error: "Only students can join shared courses" }, { status: 403 });
    }

    const programmeName = profile.programme?.name ?? "Your programme";

    const service = createServiceClient();
    const { data: rawCourse } = await service
      .from("courses")
      .select("id, scope, programme_id, level, code, title")
      .eq("id", courseId)
      .single();
    const course = rawCourse as unknown as {
      id: string;
      scope: string;
      programme_id: string | null;
      level: number;
      code: string;
      title: string;
    } | null;

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (course.scope !== "shared") {
      return NextResponse.json({ error: "Only shared courses can be joined this way" }, { status: 400 });
    }

    if (course.programme_id === profile.programme_id) {
      return NextResponse.json({ success: true, message: "already_added" });
    }

    const { data: existing } = await service
      .from("programme_courses")
      .select("course_id")
      .eq("course_id", courseId)
      .eq("programme_id", profile.programme_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, message: "already_added" });
    }

    const { data: pendingRequest } = await (service as any)
      .from("shared_course_requests")
      .select("id, status")
      .eq("course_id", courseId)
      .eq("programme_id", profile.programme_id)
      .eq("action_type", "join")
      .eq("status", "pending")
      .maybeSingle();

    if (pendingRequest) {
      return NextResponse.json({ success: true, message: "request_pending" });
    }

    const { data: insertResult, error: insertError } = await (service as any)
      .from("shared_course_requests")
      .insert({
        course_id: courseId,
        programme_id: profile.programme_id,
        requester_id: profile.id,
        action_type: "join",
        status: "pending",
      })
      .select()
      .single();

    if (insertError || !insertResult) {
      logger.error({
        event: "courses.request_join_failed",
        message: "Failed to create join request",
        userId: user.id,
        metadata: { courseId, error: insertError?.message },
      });
      return NextResponse.json({ error: insertError?.message || "Failed to create request" }, { status: 500 });
    }

    const eligibleVoters = await getEligibleVoters(
      profile.programme_id,
      course.level,
      profile.id,
    );

    for (const voter of eligibleVoters) {
      await createNotification({
        user_id: voter.id,
        type: "shared_course_vote_request",
        title: `Vote needed: Join ${course.code}`,
        body: `${profile.full_name} wants ${programmeName} to take ${course.code} — ${course.title}`,
        link: "/browse",
        metadata: {
          requestId: insertResult.id,
          actionType: "join",
          courseId: course.id,
          courseCode: course.code,
          programmeId: profile.programme_id,
        },
      });
    }

    logger.info({
      event: "courses.request_join",
      message: "Student requested to join shared course",
      userId: user.id,
      metadata: { courseId, requestId: insertResult.id, programmeId: profile.programme_id, voterCount: eligibleVoters.length },
    });
    return NextResponse.json({ success: true, message: "request_created", requestId: insertResult.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ event: "courses.request_join_exception", message: "Exception requesting to join shared course", userId: "unknown", metadata: { error: msg } });
    return NextResponse.json({ error: msg || "Failed to request joining course" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const parsedId = uuidSchema.safeParse(params.id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
    }
    const courseId = parsedId.data;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("id, programme_id, role, full_name, programme:programme_id(name)")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as {
      id: string;
      programme_id: string;
      role: string;
      full_name: string;
      programme: { name: string } | null;
    } | null;

    if (!profile?.programme_id) {
      return NextResponse.json({ error: "No programme assigned to your profile" }, { status: 400 });
    }
    if (profile.role !== "student") {
      return NextResponse.json({ error: "Only students can leave shared courses" }, { status: 403 });
    }

    const programmeName = profile.programme?.name ?? "Your programme";

    const service = createServiceClient();
    const { data: rawCourse } = await service
      .from("courses")
      .select("id, scope, programme_id, level, code, title")
      .eq("id", courseId)
      .single();
    const course = rawCourse as unknown as {
      id: string;
      scope: string;
      programme_id: string | null;
      level: number;
      code: string;
      title: string;
    } | null;

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (course.scope !== "shared") {
      return NextResponse.json({ error: "Only shared courses can be left" }, { status: 400 });
    }
    if (course.programme_id === profile.programme_id) {
      return NextResponse.json({ error: "You own this course and cannot leave it" }, { status: 400 });
    }

    const { data: linkExists } = await service
      .from("programme_courses")
      .select("course_id")
      .eq("course_id", courseId)
      .eq("programme_id", profile.programme_id)
      .maybeSingle();

    if (!linkExists) {
      return NextResponse.json({ success: true, message: "not_linked" });
    }

    const { data: pendingRequest } = await (service as any)
      .from("shared_course_requests")
      .select("id, status")
      .eq("course_id", courseId)
      .eq("programme_id", profile.programme_id)
      .eq("action_type", "leave")
      .eq("status", "pending")
      .maybeSingle();

    if (pendingRequest) {
      return NextResponse.json({ success: true, message: "request_pending" });
    }

    const { data: insertResult, error: insertError } = await (service as any)
      .from("shared_course_requests")
      .insert({
        course_id: courseId,
        programme_id: profile.programme_id,
        requester_id: profile.id,
        action_type: "leave",
        status: "pending",
      })
      .select()
      .single();

    if (insertError || !insertResult) {
      logger.error({
        event: "courses.request_leave_failed",
        message: "Failed to create leave request",
        userId: user.id,
        metadata: { courseId, error: insertError?.message },
      });
      return NextResponse.json({ error: insertError?.message || "Failed to create request" }, { status: 500 });
    }

    const eligibleVoters = await getEligibleVoters(
      profile.programme_id,
      course.level,
      profile.id,
    );

    for (const voter of eligibleVoters) {
      await createNotification({
        user_id: voter.id,
        type: "shared_course_vote_request",
        title: `Vote needed: Leave ${course.code}`,
        body: `${profile.full_name} wants ${programmeName} to stop taking ${course.code} — ${course.title}`,
        link: "/browse",
        metadata: {
          requestId: insertResult.id,
          actionType: "leave",
          courseId: course.id,
          courseCode: course.code,
          programmeId: profile.programme_id,
        },
      });
    }

    logger.info({
      event: "courses.request_leave",
      message: "Student requested to leave shared course",
      userId: user.id,
      metadata: { courseId, requestId: insertResult.id, programmeId: profile.programme_id, voterCount: eligibleVoters.length },
    });
    return NextResponse.json({ success: true, message: "request_created", requestId: insertResult.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ event: "courses.request_leave_exception", message: "Exception requesting to leave shared course", userId: "unknown", metadata: { error: msg } });
    return NextResponse.json({ error: msg || "Failed to request leaving course" }, { status: 500 });
  }
}
