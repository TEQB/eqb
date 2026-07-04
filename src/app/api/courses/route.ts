import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

const createCourseSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Za-z]{2,4}\s?\d{3,4}$/, "Invalid course code format (e.g. ENT212 or ENT 212)"),
  title: z.string().min(2).max(200).trim(),
  level: z.union([z.number(), z.string()]),
  scope: z.enum(["departmental", "shared", "general", "programme_specific"]).optional(),
  programme_id: z.string().uuid().optional(),
  programmeIds: z.array(z.string().uuid()).optional(),
  standAlone: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createCourseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const {
      code,
      title,
      level,
      scope = "departmental",
      programme_id,
      programmeIds = [],
      standAlone = false,
    } = parsed.data;

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("programme_id, role")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as { programme_id: string; role: string } | null;
    if (!profile?.programme_id || profile.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const service = createServiceClient();
    const sharedProgrammeIds = programmeIds ?? [];
    const ownerProgrammeId = standAlone
      ? null
      : (programme_id || sharedProgrammeIds[0] || profile.programme_id);
    const dbScope = standAlone
      ? "general"
      : scope === "programme_specific"
        ? "departmental"
        : scope === "shared"
          ? "shared"
          : scope === "general"
            ? "general"
            : "departmental";

    if (!standAlone && !ownerProgrammeId) {
      return NextResponse.json({ error: "Select a programme owner" }, { status: 400 });
    }
    if (dbScope === "shared" && sharedProgrammeIds.length === 0) {
      return NextResponse.json({ error: "Select at least one programme for shared scope" }, { status: 400 });
    }

    const parsedLevel = typeof level === "number" ? level : parseInt(level, 10);
    if (Number.isNaN(parsedLevel)) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }

    const { data: newCourse, error } = await service
      .from("courses")
      .insert({
        code: code.toUpperCase(),
        title,
        level: parsedLevel,
        programme_id: ownerProgrammeId,
        scope: dbScope,
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

    if (dbScope === "shared" && sharedProgrammeIds.length > 0) {
      const uniqueIds = Array.from(new Set(sharedProgrammeIds));
      await service.from("programme_courses").insert(
        uniqueIds.map((programme_id) => ({
          programme_id,
          course_id: (newCourse as { id: string }).id,
        })) as never,
      );
    }

    logger.info({
      event: "courses.created",
      message: "Course created by student",
      userId: user.id,
      metadata: { code, title, scope: dbScope, programmeIds: sharedProgrammeIds },
    });
    return NextResponse.json({ course: newCourse });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ event: "courses.create_exception", message: "Exception creating course", userId: "unknown", metadata: { error: msg } });
    return NextResponse.json({ error: msg || "Failed to create course" }, { status: 500 });
  }
}
