import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDbRateLimit } from "@/lib/utils";
import { logger } from "@/lib/logger";

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

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EQB <noreply@devalyze.space>",
        to: email,
        subject: role === "super_admin" ? "Reset your EQB admin password" : "Reset your EQB password",
        html: `<h2>Password Reset</h2>
<p>You requested a password reset for your <strong>EQB</strong> ${role === "super_admin" ? "admin" : "student"} account.</p>
<p>Click the link below to reset your password:</p>
<p style="text-align:center;padding:16px">
  <a href="${recoveryLink}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Reset your password</a>
</p>
<p style="color:#666;font-size:13px">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>`,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error({ event: "forgot_password.resend_error", message: "Resend API rejected forgot-password email", ip, email, error: errBody, metadata: { role } });
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    logger.info({ event: "forgot_password.success", message: "Password reset email sent via Resend", ip, email, durationMs: Date.now() - start, metadata: { role } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "forgot_password.error", message: "Unexpected error", ip, error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
