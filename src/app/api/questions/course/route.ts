import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSemester } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");
  const yearParam = req.nextUrl.searchParams.get("year");
  const semester = req.nextUrl.searchParams.get("semester");
  const offsetParam = req.nextUrl.searchParams.get("offset") || "0";
  const limitParam = req.nextUrl.searchParams.get("limit") || "20";

  if (!courseId) {
    return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  const offset = parseInt(offsetParam, 10);
  const limit = Math.min(parseInt(limitParam, 10), 50);
  if (isNaN(offset) || offset < 0 || isNaN(limit) || limit < 1) {
    return NextResponse.json({ error: "Invalid pagination" }, { status: 400 });
  }

  if (semester && !isValidSemester(semester)) {
    return NextResponse.json({ error: "Invalid semester" }, { status: 400 });
  }

  if (yearParam) {
    const yearNum = parseInt(yearParam, 10);
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > new Date().getFullYear()) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query = supabase
    .from("past_questions")
    .select("id, year, semester, exam_type, file_type, level, status, flag_count, created_at", { count: "exact" })
    .eq("course_id", courseId)
    .eq("status", "published")
    .order("year", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (yearParam) query = query.eq("year", parseInt(yearParam, 10));
  if (semester) query = query.eq("semester", semester);

  const { data, count } = await query;

  return NextResponse.json({
    questions: data ?? [],
    total: count ?? 0,
    offset,
    limit,
  });
}
