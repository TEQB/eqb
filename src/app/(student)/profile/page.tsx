import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  loadStudentProfile,
  loadUploadObligationDays,
} from "@/lib/student-data";
import { formatSession } from "@/lib/utils";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await loadStudentProfile(supabase, user.id);
  if (!profile) redirect("/login");

  const [obligationDays, rawUploads] = await Promise.all([
    loadUploadObligationDays(supabase),
    supabase
      .from("past_questions")
      .select("id, year, semester, status, created_at, course:course_id(code)")
      .eq("uploaded_by", profile.id)
      .order("created_at", { ascending: false }),
  ]);

  const daysRemaining = profile.last_upload_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(profile.last_upload_at).getTime() +
            obligationDays * 86400000 -
            Date.now()) /
            86400000,
        ),
      )
    : 0;

  const uploads = rawUploads.data as unknown as Array<{
    id: string;
    year: number;
    semester: string;
    status: string;
    created_at: string;
    course: { code: string } | null;
  }> | null;

  return (
    <div className="space-y-8">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-primary">Profile</h2>
      </div>

      <div className="rounded-[1.75rem] border border-white/70 bg-white/75 p-6 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
        <dl className="space-y-4">
          <div className="transition-colors hover:bg-secondary/5 -mx-6 -my-4 px-6 py-4 first:rounded-t-[1.5rem] last:rounded-b-[1.5rem]">
            <dt className="text-xs font-medium uppercase text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{profile.full_name}</dd>
          </div>
          <div className="transition-colors hover:bg-secondary/5 -mx-6 -my-4 px-6 py-4 first:rounded-t-[1.5rem] last:rounded-b-[1.5rem]">
            <dt className="text-xs font-medium uppercase text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
          </div>
          <div className="transition-colors hover:bg-secondary/5 -mx-6 -my-4 px-6 py-4 first:rounded-t-[1.5rem] last:rounded-b-[1.5rem]">
            <dt className="text-xs font-medium uppercase text-gray-500">Matric</dt>
            <dd className="mt-1 text-sm text-gray-900">{profile.matric_number}</dd>
          </div>
          <div className="transition-colors hover:bg-secondary/5 -mx-6 -my-4 px-6 py-4 first:rounded-t-[1.5rem] last:rounded-b-[1.5rem]">
            <dt className="text-xs font-medium uppercase text-gray-500">Programme</dt>
            <dd className="mt-1 text-sm text-gray-900">{profile.programme?.name || "—"}</dd>
          </div>
          <div className="transition-colors hover:bg-secondary/5 -mx-6 -my-4 px-6 py-4 first:rounded-t-[1.5rem] last:rounded-b-[1.5rem]">
            <dt className="text-xs font-medium uppercase text-gray-500">Current level</dt>
            <dd className="mt-1 text-sm text-gray-900">{profile.current_level}</dd>
          </div>
          <div className="transition-colors hover:bg-secondary/5 -mx-6 -my-4 px-6 py-4 first:rounded-t-[1.5rem] last:rounded-b-[1.5rem]">
            <dt className="text-xs font-medium uppercase text-gray-500">
              Upload obligation
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {profile.last_upload_at
                ? `${daysRemaining} days remaining`
                : "No uploads yet — action required"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="animate-fade-in-up stagger-2">
        <h3 className="text-sm font-medium uppercase tracking-wider text-gray-500">
          Upload history
        </h3>
        {uploads && uploads.length > 0 ? (
          <div className="mt-3 space-y-2">
            {uploads.map((u, idx) => {
              const course = u.course as unknown as { code: string } | null;
              return (
                <div
                  key={u.id}
                  className="animate-fade-in-up flex items-center justify-between rounded-2xl border border-white/70 bg-white/75 p-4 shadow-[0_14px_30px_rgba(63,39,50,0.06)] transition-all duration-normal hover:-translate-y-0.5 hover:border-secondary/30 hover:shadow-[0_18px_38px_rgba(63,39,50,0.12)]"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <p className="text-sm text-gray-900">
                    {course?.code || "Unknown"} — {formatSession(u.year)}{" "}
                    {u.semester === "first" ? "1st" : "2nd"} Sem
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.status === "published"
                        ? "bg-secondary/10 text-secondary"
                        : u.status === "rejected"
                          ? "bg-danger-50 text-danger-600"
                          : "bg-warning-50 text-warning-600"
                    }`}
                  >
                    {u.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            You haven&apos;t uploaded any past questions yet.
          </p>
        )}
      </div>
    </div>
  );
}
