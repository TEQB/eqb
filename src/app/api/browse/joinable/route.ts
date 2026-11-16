import { NextRequest, NextResponse } from "next/server";
import { getAuthProfile } from "@/lib/apiAuth";
import { loadJoinableSharedCourses } from "@/lib/student-data";

export async function GET(req: NextRequest) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "student") return NextResponse.json({ error: "Students only" }, { status: 403 });

  const programmeId = req.nextUrl.searchParams.get("programme_id");

  if (!programmeId) {
    return NextResponse.json({ error: "programme_id required" }, { status: 400 });
  }

  try {
    const courses = await loadJoinableSharedCourses(programmeId);
    return NextResponse.json({ courses });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
