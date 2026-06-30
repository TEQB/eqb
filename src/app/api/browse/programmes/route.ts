import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const facultyId = req.nextUrl.searchParams.get("faculty_id");
  if (!facultyId) {
    return NextResponse.json({ error: "faculty_id is required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data } = await service
    .from("departments")
    .select("id, name")
    .eq("faculty_id", facultyId)
    .order("name");

  return NextResponse.json({ programmes: data ?? [] });
}
