import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

const UploadForm = dynamic(() => import("@/components/upload/UploadForm"), { ssr: false });

async function loadCourses() {
  const supabase = createClient();
  const { data: rawCourses } = await supabase
    .from("courses")
    .select("id, code, title, level, scope")
    .order("level");
  return (rawCourses as unknown as Array<{
    id: string;
    code: string;
    title: string;
    level: number;
    scope: string;
  }>) ?? [];
}

export default async function UploadPage({
  searchParams,
}: {
  searchParams: { locked?: string; courseId?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const courses = await loadCourses();
  const preselectedCourseId = searchParams.courseId;

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5">
        <h2 className="text-xl font-semibold text-primary">Upload Past Question</h2>
      </div>
      <UploadForm courses={courses} preselectedCourseId={preselectedCourseId} />
    </div>
  );
}
