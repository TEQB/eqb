import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data } = await supabase
    .from("departments")
    .select("id, name, faculty_id, faculties!inner(name)")
    .order("name");

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
