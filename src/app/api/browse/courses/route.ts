import { NextRequest, NextResponse } from "next/server";
import { getAuthProfile } from "@/lib/apiAuth";
import { createClient } from "@/lib/supabase/server";
import { loadStudentCourseGroups, loadPublishedQuestionCounts } from "@/lib/student-data";

export async function GET(req: NextRequest) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "student") return NextResponse.json({ error: "Students only" }, { status: 403 });

  const supabase = createClient();
  const programmeId = req.nextUrl.searchParams.get("programme_id");

  if (!programmeId) {
    return NextResponse.json({ error: "programme_id required" }, { status: 400 });
  }

  try {
    const courseGroups = await loadStudentCourseGroups(supabase, programmeId);
    const questionCounts = await loadPublishedQuestionCounts(
      supabase,
      courseGroups.allCourses.map((c) => c.id),
    );

    const courses = courseGroups.allCourses.map((c) => ({
      ...c,
      questionCount: questionCounts[c.id] || 0,
    }));

    return NextResponse.json({ courses });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
