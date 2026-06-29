import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const departmentId = req.nextUrl.searchParams.get("department_id");
  if (!departmentId) {
    return NextResponse.json({ error: "department_id is required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data } = await service
    .from("courses")
    .select("id, code, title, level")
    .eq("department_id", departmentId)
    .order("level")
    .order("code");

  return NextResponse.json({ courses: data ?? [] });
}
