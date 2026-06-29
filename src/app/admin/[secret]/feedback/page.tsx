import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type FeedbackMessage = {
  id: string;
  message: string;
  created_at: string | null;
  profile_id: string;
};

type FeedbackProfile = {
  id: string;
  full_name: string;
  matric_number: string;
  current_level: number;
  department: { name: string } | null;
};

export default async function AdminFeedbackPage({
  params,
}: {
  params: { secret: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/admin/${params.secret}/login`);

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();
  const profile = rawProfile as unknown as { role: string } | null;

  if (profile?.role !== "super_admin") {
    redirect(`/admin/${params.secret}/login`);
  }

  const service = createServiceClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: totalCount }, { count: recentCount }, messagesRes] =
    await Promise.all([
      service
        .from("feedback_messages")
        .select("id", { count: "exact", head: true }),
      service
        .from("feedback_messages")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),
      service
        .from("feedback_messages")
        .select("id, message, created_at, profile_id")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const messages = (messagesRes.data as unknown as FeedbackMessage[] | null) ?? [];
  const profileIds = Array.from(new Set(messages.map((message) => message.profile_id)));

  let profileRows: unknown[] = [];
  if (profileIds.length > 0) {
    const { data } = await service
      .from("profiles")
      .select("id, full_name, matric_number, current_level, department:department_id(name)")
      .in("id", profileIds);
    profileRows = (data as unknown[] | null) ?? [];
  }

  const profiles = profileRows as FeedbackProfile[];
  const profilesById = new Map(profiles.map((item) => [item.id, item]));

  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("en-NG", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : "Unknown time";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Feedback Inbox</h2>
          <p className="mt-1 text-sm text-gray-500">
            Review student suggestions and store them privately on the admin side.
          </p>
        </div>
        <Link
          href={`/admin/${params.secret}/dashboard`}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Total messages
          </p>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {totalCount ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Last 7 days
          </p>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {recentCount ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-primary/5 p-5 shadow-sm xl:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Private inbox
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Students can submit feedback without seeing admin identities. This
            page keeps the full message history on the admin side only.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        {messages.length > 0 ? (
          messages.map((message) => {
            const student = profilesById.get(message.profile_id);

            return (
              <article
                key={message.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {student?.full_name ?? "Unknown student"}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {student?.matric_number ?? "No matric number"} - Level{" "}
                      {student?.current_level ?? "?"}
                      {student?.department?.name
                        ? ` - ${student.department.name}`
                        : ""}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatDate(message.created_at)}
                  </p>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {message.message}
                </p>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">No feedback yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Once students start sending feedback, it will appear here automatically.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
