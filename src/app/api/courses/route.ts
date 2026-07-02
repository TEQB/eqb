import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, title, level, scope = "departmental", programmeIds = [] } = await req.json();

    if (!code || !title || !level) {
      return NextResponse.json({ error: "code, title, and level are required" }, { status: 400 });
    }

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("department_id")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as { department_id: string } | null;
    if (!profile?.department_id) {
      return NextResponse.json({ error: "Your profile does not have a programme assigned. Please contact support." }, { status: 404 });
    }

    const service = createServiceClient();
    const selectedProgrammeIds = Array.isArray(programmeIds)
      ? programmeIds.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
      : [];
    const owningProgrammeId = selectedProgrammeIds[0] || profile.department_id;
    const effectiveScope = scope === "shared" ? "shared" : scope === "general" ? "general" : "departmental";
    const { data: newCourse, error } = await service
      .from("courses")
      .insert({
        code: code.toUpperCase(),
        title,
        level: parseInt(level, 10),
        department_id: effectiveScope === "departmental" ? owningProgrammeId : null,
        scope: effectiveScope,
      } as never)
      .select("id, code, title, level, scope")
      .single();

    if (error) {
      logger.error({ event: "courses.create_failed", message: "Failed to create course", userId: user.id, metadata: { error: error.message } });
      return NextResponse.json({ error: error.message || "Failed to create course" }, { status: 500 });
    }

    if (!newCourse) {
      logger.error({ event: "courses.create_no_return", message: "Course insert succeeded but no data returned", userId: user.id, metadata: { code } });
      return NextResponse.json({ error: "Failed to retrieve created course" }, { status: 500 });
    }

    if ((effectiveScope === "shared" || effectiveScope === "general") && selectedProgrammeIds.length > 0) {
      await service.from("department_courses").insert(
        selectedProgrammeIds.map((department_id) => ({
          department_id,
          course_id: (newCourse as { id: string }).id,
        })) as never,
      );
    }

    logger.info({
      event: "courses.created",
      message: "Course created by student",
      userId: user.id,
      metadata: { code, title, scope: effectiveScope, programmeIds: selectedProgrammeIds },
    });
    return NextResponse.json({ course: newCourse });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ event: "courses.create_exception", message: "Exception creating course", userId: "unknown", metadata: { error: msg } });
    return NextResponse.json({ error: msg || "Failed to create course" }, { status: 500 });
  }
}
