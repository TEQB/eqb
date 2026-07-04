import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { testEmailSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { sendViaResend, sendViaBrevo, sendViaMailjet } from "@/lib/mailer";

async function assertAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: rawProfile } = await service
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();
  const profile = rawProfile as unknown as { role: string } | null;
  if (profile?.role !== "super_admin") return null;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const isAdmin = await assertAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = testEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }
  const testEmail = parsed.data.email;

  const subject = "EQB Test Email";
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>EQB Email Test</title>
</head>
<body style="margin:0;padding:0;background:#FAF7F4;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#7A1030;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#FAF7F4;font-size:28px;font-weight:700;letter-spacing:0.05em;">EQB</h1>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 16px;color:#7A1030;font-size:20px;">Email Provider Test</h1>
      <p style="margin:0 0 12px;color:#333;line-height:1.6;">
        Hello! This is a test email sent from <strong>EQB</strong>.
      </p>
      <p style="margin:0 0 24px;color:#333;line-height:1.6;">
        If you received this, your email delivery is working correctly.
      </p>
      <div style="background:#FAF7F4;border-radius:8px;padding:16px 20px;">
        <p style="margin:0 0 4px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Sent to</p>
        <p style="margin:0;color:#7A1030;font-weight:600;">${testEmail}</p>
      </div>
    </div>
    <div style="background:#FAF7F4;padding:16px 40px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">EQB — Past Questions Platform</p>
    </div>
  </div>
</body>
</html>`;

  const results: Record<string, { status: string; message: string; durationMs?: number }> = {};

  // Test Resend
  try {
    const start = Date.now();
    await sendViaResend(testEmail, subject, html);
    results.resend = { status: "success", message: "Email sent via Resend", durationMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.resend = { status: "failed", message: msg };
    logger.error({ event: "test.resend_failed", message: "Test email via Resend failed", metadata: { to: testEmail, error: msg } });
  }

  // Test Brevo
  try {
    const start = Date.now();
    await sendViaBrevo(testEmail, subject, html);
    results.brevo = { status: "success", message: "Email sent via Brevo", durationMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.brevo = { status: "failed", message: msg };
    logger.error({ event: "test.brevo_failed", message: "Test email via Brevo failed", metadata: { to: testEmail, error: msg } });
  }

  // Test Mailjet
  try {
    const start = Date.now();
    await sendViaMailjet(testEmail, subject, html);
    results.mailjet = { status: "success", message: "Email sent via Mailjet", durationMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.mailjet = { status: "failed", message: msg };
    logger.error({ event: "test.mailjet_failed", message: "Test email via Mailjet failed", metadata: { to: testEmail, error: msg } });
  }

  const allSuccessful =
    results.resend?.status === "success" &&
    results.brevo?.status === "success" &&
    results.mailjet?.status === "success";
  const anySuccessful =
    results.resend?.status === "success" ||
    results.brevo?.status === "success" ||
    results.mailjet?.status === "success";

  logger.info({
    event: "test.email.completed",
    message: "Email provider test completed (all three providers)",
    metadata: { to: testEmail, results, ip },
  });

  return NextResponse.json(
    {
      email: testEmail,
      allProvidersTested: true,
      results,
      summary: allSuccessful
        ? "All three providers working correctly"
        : anySuccessful
        ? "At least one provider working"
        : "Resend, Brevo, and Mailjet all failed — check logs",
    },
    { status: anySuccessful ? 200 : 500 },
  );
}