import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

const STATUS_BADGE: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  pending_review: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-gray-100 text-gray-700",
};

export default async function ContributionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const profile = rawProfile as unknown as { id: string } | null;
  if (!profile) redirect("/login");

  const [uploadsResult, solutionsResult] = await Promise.all([
    supabase
      .from("past_questions")
      .select("id, year, semester, status, created_at, course:course_id(code, title)")
      .eq("uploaded_by", profile.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("solutions")
      .select("id, body, file_url, created_at, upvotes, downvotes, question_id, question:question_id(year, semester, course:course_id(code, title))")
      .eq("submitted_by", profile.id)
      .order("created_at", { ascending: false }),
  ]);

  const rawUploads = (uploadsResult.data ?? []) as unknown as Array<{
    id: string; year: number; semester: string; status: string; created_at: string | null;
    course: { code: string; title: string } | null;
  }>;

  const rawSolutions = (solutionsResult.data ?? []) as unknown as Array<{
    id: string; body: string | null; file_url: string | null; created_at: string | null;
    upvotes: number; downvotes: number; question_id: string;
    question: { year: number; semester: string; course: { code: string; title: string } | null } | null;
  }>;

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-down rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-primary">My Contributions</h2>
        <p className="mt-1 text-sm text-gray-500">
          {rawUploads.length} question{rawUploads.length !== 1 ? "s" : ""} uploaded &middot; {rawSolutions.length} solution{rawSolutions.length !== 1 ? "s" : ""} submitted
        </p>
      </div>

      <section className="animate-fade-in-up stagger-1">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
          Uploaded Questions
        </h3>
        {rawUploads.length === 0 ? (
          <div className="clay-surface animate-fade-in rounded-2xl p-8 text-center">
            <p className="text-gray-500">You haven&apos;t uploaded any questions yet.</p>
            <Link href="/upload" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Upload your first question
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Course</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Session</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rawUploads.map((q) => (
                  <tr key={q.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/question/${q.id}`} className="font-medium text-primary hover:underline">
                        {q.course?.code ?? "—"} &middot; {q.course?.title ?? "Unknown"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {q.year}/{Number(q.year) + 1} &middot; {q.semester}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[q.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {q.created_at ? format(new Date(q.created_at), "dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="animate-fade-in-up stagger-2">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
          Submitted Solutions
        </h3>
        {rawSolutions.length === 0 ? (
          <div className="clay-surface animate-fade-in rounded-2xl p-8 text-center">
            <p className="text-gray-500">You haven&apos;t submitted any solutions yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Question</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Session</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Votes</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rawSolutions.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/question/${s.question_id}`} className="font-medium text-primary hover:underline">
                        {s.question?.course?.code ?? "—"} &middot; {s.question?.course?.title ?? "Unknown"}
                      </Link>
                      {s.body && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{s.body}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {s.question?.year ?? "—"}/{s.question ? Number(s.question.year) + 1 : "—"} &middot; {s.question?.semester ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-green-600">+{s.upvotes}</span>
                      <span className="mx-1 text-gray-300">/</span>
                      <span className="text-red-600">-{s.downvotes}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {s.created_at ? format(new Date(s.created_at), "dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
