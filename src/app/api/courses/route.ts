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

    const { code, title, level } = await req.json();

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
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const service = createServiceClient();
    const { data: newCourse, error } = await service
      .from("courses")
      .insert({
        code: code.toUpperCase(),
        title,
        level: parseInt(level),
        department_id: profile.department_id,
        scope: "departmental",
      } as never)
      .select("id, code, title, level")
      .single();

    if (error) {
      logger.error({ event: "courses.create_failed", message: "Failed to create course", userId: user.id, metadata: { error: error.message } });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info({ event: "courses.created", message: "Course created by student", userId: user.id, metadata: { code, title } });
    return NextResponse.json({ course: newCourse });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
