import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { createServiceClient } from "@/lib/supabase/service";
import Link from "next/link";

export default async function AdminDashboardPage({
  params,
}: {
  params: { secret: string };
}) {
  const service = createServiceClient();
  const { count: feedbackCount } = await service
    .from("feedback_messages")
    .select("id", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">
            Monitor platform activity and keep an eye on student feedback.
          </p>
        </div>
        <Link
          href={`/admin/${params.secret}/feedback`}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <span>Feedback Inbox</span>
          <span className="inline-flex min-w-7 justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
            {feedbackCount ?? 0}
          </span>
        </Link>
      </div>
      <AdminDashboard secret={params.secret} />
    </div>
  );
}
