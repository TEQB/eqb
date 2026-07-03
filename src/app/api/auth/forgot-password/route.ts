import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDbRateLimit, hashOtp } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/mailer";
import { passwordResetOtpTemplate } from "@/lib/email-templates";
import { withAuthRetry, serializeAuthError, isTransientAuthError } from "@/lib/supabase/admin-retry";

type ResetRole = "student" | "super_admin";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    const { data: authUsers, error: listErr } = await withAuthRetry(() =>
      supabase.auth.admin.listUsers({ perPage: 1000 })
    );

    if (listErr) {
      logger.error({ event: "forgot_password.list_users_failed", message: "Failed to list auth users", ip, email, error: listErr.message, metadata: { supabaseError: serializeAuthError(listErr), role } });

      if (isTransientAuthError(listErr)) {
        return NextResponse.json({ error: "Our authentication provider is temporarily unavailable. Please try again in a few minutes." }, { status: 503 });
      }

      return NextResponse.json({ error: "Could not verify account" }, { status: 500 });
    }

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

    const code = generateCode();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase.from("password_reset_otps" as never).insert({
      email,
      code_hash: codeHash,
      expires_at: expiresAt,
    } as never);

    if (dbError) {
      logger.error({ event: "forgot_password.db_error", message: "Failed to store password reset OTP", ip, email, error: dbError.message, metadata: { role } });
      return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }

    try {
      const { subject, html } = passwordResetOtpTemplate(code, role === "super_admin");
      await sendEmail(email, subject, html);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ event: "forgot_password.email_error", message: "Failed to send password reset email", ip, email, error: msg, metadata: { role } });
      return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
    }

    logger.info({ event: "forgot_password.success", message: "Password reset OTP sent", ip, email, durationMs: Date.now() - start, metadata: { role } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "forgot_password.error", message: "Unexpected error", ip, error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
