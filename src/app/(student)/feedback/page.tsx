import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import {
  loadStudentFeedbackMessages,
  loadStudentProfile,
} from "@/lib/student-data";

export default async function FeedbackPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await loadStudentProfile(supabase, user.id);
  if (!profile) redirect("/login");

  const feedback = await loadStudentFeedbackMessages(supabase, profile.id);

  return (
    <div className="space-y-8">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
        <h2 className="text-xl font-semibold text-primary">Feedback</h2>
        <p className="mt-1 text-sm text-gray-500">
          Share anything that would make EQB better. Your message goes to the admin team and your admin contacts stay private.
        </p>
      </div>

      <FeedbackForm />

      <section className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wider text-gray-500">
          Your recent feedback
        </h3>
        {feedback.length > 0 ? (
          <div className="space-y-3">
            {feedback.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.25rem] border border-white/70 bg-white/75 p-4 shadow-[0_14px_30px_rgba(63,39,50,0.06)]"
              >
                <p className="text-sm text-gray-700">{item.message}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {item.created_at ? new Date(item.created_at).toLocaleString() : "Recently"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-gray-300 bg-white/70 p-6 text-sm text-gray-500">
            You have not sent any feedback yet.
          </div>
        )}
      </section>
    </div>
  );
}
