import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { loadCoursesForProgramme } from "@/lib/student-data";

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const programmeId = req.nextUrl.searchParams.get("programme_id");
  if (!programmeId) {
    return NextResponse.json({ error: "programme_id is required" }, { status: 400 });
  }

  const service = createServiceClient();
  const courses = await loadCoursesForProgramme(service, programmeId);

  return NextResponse.json({
    courses: courses.map(({ id, code, title, level }) => ({ id, code, title, level })),
  });
}
