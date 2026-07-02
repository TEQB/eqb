import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDbRateLimit } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getAdminRecipientEmails } from "@/lib/admin-recipients";
import { sendEmail } from "@/lib/mailer";
import { feedbackTemplate } from "@/lib/email-templates";

export async function POST(req: Request) {
  const start = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (message.length < 10) {
      return NextResponse.json(
        { error: "Please write at least 10 characters." },
        { status: 400 },
      );
    }
    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Feedback is too long." },
        { status: 400 },
      );
    }

    const rateKey = `feedback:${user.id}:${ip}`;
    if (!(await checkDbRateLimit(rateKey, 5, 60_000))) {
      logger.warn({ event: "feedback.rate_limited", message: "Feedback rate limit hit", ip, userId: user.id });
      return NextResponse.json(
        { error: "Too many submissions. Please wait before trying again." },
        { status: 429 },
      );
    }

    const service = createServiceClient();
    const { data: rawProfile } = await service
      .from("profiles" as never)
      .select("id, full_name, programme:department_id(name)")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    const profile = rawProfile as unknown as {
      id: string;
      full_name: string;
      programme: { name: string } | null;
    } | null;

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { error: insertError } = await service
      .from("feedback_messages" as never)
      .insert({
        profile_id: profile.id,
        message,
      } as never);

    if (insertError) {
      logger.error({ event: "feedback.insert_failed", message: "Failed to store feedback", userId: user.id, error: insertError.message });
      return NextResponse.json(
        { error: "Could not save your feedback" },
        { status: 500 },
      );
    }

    const adminEmails = await getAdminRecipientEmails(service);
    if (adminEmails.length > 0) {
      const [to, ...bcc] = adminEmails;
      const { subject, html } = feedbackTemplate(
        profile.full_name,
        profile.programme?.name || "Unknown",
        message,
      );

      let emailFailed = false;
      try {
        await sendEmail(to, subject, html, bcc);
      } catch (err) {
        emailFailed = true;
        const msg = err instanceof Error ? err.message : String(err);
        logger.error({ event: "feedback.email_failed", message: "Feedback email failed", userId: user.id, error: msg });
      }

      if (emailFailed) {
        return NextResponse.json({ error: "Feedback saved but admin notification failed" }, { status: 500 });
      }
    } else {
      logger.warn({ event: "feedback.no_admin_recipients", message: "No admin recipients available for feedback email", userId: user.id });
    }

    logger.info({ event: "feedback.sent", message: "Student feedback submitted", userId: user.id, durationMs: Date.now() - start });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "feedback.error", message: "Unexpected feedback error", error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
