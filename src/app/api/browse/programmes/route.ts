import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const facultyId = req.nextUrl.searchParams.get("faculty_id");

  let query = supabase
    .from("programmes")
    .select("id, name, faculty_id, faculties!inner(name)")
    .order("name");

  if (facultyId) query = query.eq("faculty_id", facultyId);

  const { data } = await query;

  const programmes = (data as unknown as Array<{
    id: string;
    name: string;
    faculty_id: string;
    faculties: { name: string };
  }> | null) ?? [];

  return NextResponse.json({
    programmes: programmes.map((programme) => ({
      id: programme.id,
      name: programme.name,
      faculty_id: programme.faculty_id,
      faculty_name: programme.faculties?.name || "",
    })),
  });
}
