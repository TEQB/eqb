import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { UploadForm } from "@/components/upload/UploadForm";
import { UploadWall } from "@/components/upload/UploadWall";
import {
  loadStudentProfile,
  loadUploadObligationDays,
} from "@/lib/student-data";

async function loadCourses() {
  const supabase = createClient();
  const { data: rawCourses } = await supabase
    .from("courses")
    .select("id, code, title, level")
    .order("level");
  return (rawCourses as unknown as Array<{
    id: string;
    code: string;
    title: string;
    level: number;
  }>) ?? [];
}

function UploadFormSkeleton() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-full bg-gray-100" />
        <div className="mx-auto mb-2 h-4 w-48 animate-pulse rounded bg-gray-100" />
        <div className="mx-auto h-3 w-32 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 h-4 w-16 animate-pulse rounded bg-gray-100" />
          <div className="h-11 w-full animate-pulse rounded-md bg-gray-100" />
        </div>
        <div>
          <div className="mb-1 h-4 w-12 animate-pulse rounded bg-gray-100" />
          <div className="h-11 w-full animate-pulse rounded-md bg-gray-100" />
        </div>
      </div>
      <div className="h-12 w-full animate-pulse rounded-md bg-gray-100" />
    </div>
  );
}

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

  const courses = await loadCourses();

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

      <Suspense fallback={<UploadFormSkeleton />}>
        <UploadForm courses={courses} />
      </Suspense>
    </div>
  );
}