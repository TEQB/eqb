import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentLayoutClient } from "./StudentLayoutClient";
import {
  loadStudentFeedbackCount,
  loadStudentProfile,
  loadUploadObligationDays,
} from "@/lib/student-data";
import { daysRemaining as calculateDaysRemaining } from "@/lib/utils";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const profile = await loadStudentProfile(supabase, user.id);
  if (!profile) redirect("/login");

  const obligationDays = await loadUploadObligationDays(supabase);
  const feedbackCount = await loadStudentFeedbackCount(supabase, profile.id);

  const daysRemaining = calculateDaysRemaining(
    profile.last_upload_at,
    obligationDays,
  );

  return (
      <StudentLayoutClient
      profile={{
        id: profile.id,
        fullName: profile.full_name,
        programmeId: profile.programme_id,
        currentLevel: profile.current_level,
        isLocked: profile.is_locked,
        daysRemaining,
      }}
      feedbackCount={feedbackCount}
    >
      {children}
    </StudentLayoutClient>
  );
}
