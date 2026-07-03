import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import {
  loadJoinableSharedCourses,
  loadStudentCourseGroups,
  loadStudentProfile,
} from "@/lib/student-data";

const UploadForm = dynamic(() => import("@/components/upload/UploadForm"), { ssr: false });

export default async function UploadPage({
  searchParams,
}: {
  searchParams: { locked?: string; courseId?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadStudentProfile(supabase, user.id);
  if (!profile) redirect("/login");

  const courseGroups = await loadStudentCourseGroups(supabase, profile.programme_id);
  const joinableSharedCourses = await loadJoinableSharedCourses(profile.programme_id);

  const { data: rawProgrammes } = await supabase
    .from("programmes")
    .select("id, name, faculty_id, faculty:faculty_id(name)")
    .order("name");
  const programmes = ((rawProgrammes as unknown as Array<{
    id: string;
    name: string;
    faculty_id: string;
    faculty: { name: string } | null;
  }>) ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    faculty_id: p.faculty_id,
    faculty_name: p.faculty?.name ?? "",
  }));

  const preselectedCourseId = searchParams.courseId;

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5">
        <h2 className="text-xl font-semibold text-primary">Upload Past Question</h2>
      </div>
      <UploadForm
        courses={courseGroups.allCourses}
        preselectedCourseId={preselectedCourseId}
        currentProgrammeId={profile.programme_id}
        currentProgrammeName={profile.programme?.name ?? "My programme"}
        programmes={programmes}
        joinableSharedCourses={joinableSharedCourses}
      />
    </div>
  );
}
