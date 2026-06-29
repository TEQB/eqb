import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { UploadForm } from "@/components/upload/UploadForm";
import { UploadWall } from "@/components/upload/UploadWall";
import {
  loadStudentProfile,
  loadUploadObligationDays,
} from "@/lib/student-data";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: { locked?: string; courseId?: string };
}) {
  const supabase = createClient();
  const service = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const profile = await loadStudentProfile(supabase, user.id);
  if (!profile) redirect("/login");

  if (profile.is_locked || searchParams.locked === "true") {
    const obligationDays = await loadUploadObligationDays(service, 30);
    return <UploadWall obligationDays={obligationDays} />;
  }

  const { data: rawCourses } = await supabase
    .from("courses")
    .select("id, code, title, level")
    .order("level");
  const courses = rawCourses as unknown as Array<{
    id: string;
    code: string;
    title: string;
    level: number;
  }> | null;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-down rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-primary">
          Upload Past Question
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Add a question, attach a file, and keep the experience clean on every screen size.
        </p>
      </div>
      <div className="animate-fade-in-up">
        <UploadForm courses={courses || []} />
      </div>
    </div>
  );
}
