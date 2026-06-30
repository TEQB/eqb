import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDbRateLimit } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getResendClient, RESEND_FROM_EMAIL } from "@/lib/resend";
import { passwordResetTemplate } from "@/lib/email-templates";

type ResetRole = "student" | "super_admin";

export async function POST(req: NextRequest) {
  const start = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const role = (body.role === "super_admin" ? "super_admin" : "student") as ResetRole;
    const redirectTo =
      typeof body.redirectTo === "string" && body.redirectTo.startsWith("http")
        ? body.redirectTo
        : `${new URL(req.url).origin}/${role === "super_admin" ? "admin" : "login"}`;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const rateKey = `forgot-password:${role}:${ip}:${email.toLowerCase()}`;
    if (!(await checkDbRateLimit(rateKey, 3, 60_000))) {
      logger.warn({ event: "forgot_password.rate_limited", message: "Forgot password rate limit hit", ip, email, metadata: { role } });
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429 },
      );
    }

    const supabase = createServiceClient();
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authUser = authUsers?.users?.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    if (!authUser) {
      logger.info({ event: "forgot_password.no_user", message: "Password reset requested for unknown email", ip, email, metadata: { role } });
      return NextResponse.json({ success: true });
    }

    const { data: rawProfile } = await supabase
      .from("profiles" as never)
      .select("role")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();
    const profile = rawProfile as unknown as { role: string } | null;

    if (profile?.role !== role) {
      logger.info({ event: "forgot_password.role_mismatch", message: "Password reset requested for mismatched role", ip, email, metadata: { role } });
      return NextResponse.json({ success: true });
    }

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (linkErr) {
      logger.error({ event: "forgot_password.generate_link_failed", message: "Failed to generate recovery link", ip, email, error: linkErr.message, metadata: { role } });
      return NextResponse.json({ error: "Could not generate reset link" }, { status: 500 });
    }

    const recoveryLink = linkData?.properties?.action_link;
    if (!recoveryLink) {
      logger.error({ event: "forgot_password.no_link", message: "No action_link in generateLink response", ip, email, metadata: { role } });
      return NextResponse.json({ error: "Could not generate reset link" }, { status: 500 });
    }

    let resendErrorMsg: string | null = null;
    try {
      const { subject, html } = passwordResetTemplate(recoveryLink, role === "super_admin");
      const { error: resendErr } = await getResendClient().emails.send({
        from: RESEND_FROM_EMAIL,
        to: email,
        subject,
        html,
      });

      if (resendErr) {
        resendErrorMsg = resendErr.message;
        logger.error({ event: "forgot_password.resend_error", message: "Resend API rejected email", ip, email, error: resendErr.message, metadata: { role } });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      resendErrorMsg = msg;
      logger.error({ event: "forgot_password.resend_error", message: "Resend threw an exception", ip, email, error: msg, metadata: { role } });
    }

    if (resendErrorMsg) {
      return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
    }

    logger.info({ event: "forgot_password.success", message: "Password reset email sent via Resend", ip, email, durationMs: Date.now() - start, metadata: { role } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "forgot_password.error", message: "Unexpected error", ip, error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
