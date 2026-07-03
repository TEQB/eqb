import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

const uuidSchema = z.string().uuid();

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
      .select("id, programme_id, role")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as {
      id: string;
      programme_id: string;
      role: string;
    } | null;

    if (!profile?.programme_id) {
      return NextResponse.json({ error: "Your profile does not have a programme assigned" }, { status: 400 });
    }
    if (profile.role !== "student") {
      return NextResponse.json({ error: "Only students can join shared courses" }, { status: 403 });
    }

    const service = createServiceClient();
    const { data: rawCourse } = await service
      .from("courses")
      .select("id, scope, programme_id")
      .eq("id", courseId)
      .single();
    const course = rawCourse as unknown as {
      id: string;
      scope: string;
      programme_id: string | null;
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

    const { error: insertError } = await service.from("programme_courses").insert({
      programme_id: profile.programme_id,
      course_id: courseId,
    } as never);

    if (insertError) {
      logger.error({
        event: "courses.join_shared_failed",
        message: "Failed to join shared course",
        userId: user.id,
        metadata: { courseId, error: insertError.message },
      });
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    logger.info({
      event: "courses.join_shared",
      message: "Student joined shared course",
      userId: user.id,
      metadata: { courseId, programmeId: profile.programme_id },
    });
    return NextResponse.json({ success: true, message: "joined" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ event: "courses.join_shared_exception", message: "Exception joining shared course", userId: "unknown", metadata: { error: msg } });
    return NextResponse.json({ error: msg || "Failed to join course" }, { status: 500 });
  }
}
