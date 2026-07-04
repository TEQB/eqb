import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDbRateLimit } from "@/lib/utils";
import { createAccountSchema } from "@/lib/validations";
import { validatePassword } from "@/lib/password";
import { logger } from "@/lib/logger";
import { withAuthRetry, serializeAuthError, isTransientAuthError } from "@/lib/supabase/admin-retry";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  const start = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    const body = await req.json();
    const parsed = createAccountSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn({ event: "account.create.invalid_input", message: "Invalid account creation input", ip });
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const allowedDomain = process.env.NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN;
    if (allowedDomain && !email.toLowerCase().endsWith(allowedDomain)) {
      logger.warn({ event: "account.create.invalid_input", message: "Invalid registration input", ip, email });
      return NextResponse.json({ error: "Invalid registration details" }, { status: 400 });
    }

    const rateKey = `create-account:${ip}:${email.toLowerCase()}`;
    if (!(await checkDbRateLimit(rateKey, 5, 60_000))) {
      logger.warn({ event: "account.create.rate_limited", message: "Account creation rate limit hit", ip, email });
      return NextResponse.json(
        { error: "Too many account creation attempts. Please wait before trying again." },
        { status: 429 },
      );
    }

    const supabase = createServiceClient();

    const { data: reg, error: regError } = await supabase
      .from("pending_registrations")
      .select("*")
      .eq("email", email)
      .single();

    if (regError) {
      logger.error({ event: "account.create.reg_fetch_error", message: "Failed to fetch pending registration", ip, email, error: regError.message });
      return NextResponse.json({ error: "Failed to fetch registration data" }, { status: 500 });
    }

    if (!reg) {
      logger.warn({ event: "account.create.no_pending", message: "No pending registration found", ip, email });
      return NextResponse.json({ error: "No pending registration" }, { status: 400 });
    }

    const passwordCheck = validatePassword(password, {
      email,
      matricNumber: reg.matric_number,
    });
    if (!passwordCheck.valid) {
      logger.warn({ event: "account.create.weak_password", message: "Password does not meet strength requirements", ip, email });
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("matric_number", (reg.matric_number || "").trim().toUpperCase())
      .maybeSingle();

    if (existingProfile) {
      logger.warn({ event: "account.create.duplicate_matric", message: "Matric number already registered", ip, email, metadata: { matricNumber: reg.matric_number } });
      return NextResponse.json({ error: "This matric number is already registered." }, { status: 409 });
    }

    const { data: userData, error: createError } = await withAuthRetry(() =>
      supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // email ownership already verified via OTP earlier in registration
        user_metadata: {
          full_name: reg.full_name,
          matric_number: reg.matric_number,
          programme_id: reg.programme_id,
          current_level: reg.current_level,
        },
      })
    );

    if (createError) {
      logger.error({ 
        event: "account.create.failed", 
        message: "Failed to create account via Supabase admin", 
        ip, 
        email, 
        error: createError.message,
        metadata: { 
          email,
          hasPassword: !!password,
          metadataFields: Object.keys(reg),
          supabaseError: serializeAuthError(createError)
        }
      });
      
      if (isTransientAuthError(createError)) {
        return NextResponse.json({ 
          error: "Our authentication provider is temporarily unavailable. Please try again in a few minutes." 
        }, { status: 503 });
      }
      
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    await supabase.from("pending_registrations").delete().eq("email", email);

    // Send welcome email (non-blocking)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || process.env.VERCEL_URL || "";
    const loginUrl = siteUrl ? `${siteUrl}/login` : "#";

    try {
      const welcomeHtml = `<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;line-height:1.6">
<div style="background:linear-gradient(135deg,#7c3aed,#6366f1);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="color:#fff;margin:0;font-size:24px">Welcome to EQB, ${reg.full_name}!</h1>
<p style="color:#e0e7ff;margin:8px 0 0 0;font-size:15px">Exam Questions Bank — built by students, for students.</p>
</div>
<div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
<p style="margin:0 0 16px 0">Hi ${reg.full_name},</p>
<p style="margin:0 0 16px 0">Your account has been successfully created using <strong>${email}</strong>. You can now log in and start exploring past questions uploaded by students across your programme and beyond.</p>

<table style="width:100%;border-collapse:collapse;margin:20px 0">
<tr>
<td style="padding:12px;background:#f5f3ff;border-radius:8px">
<p style="margin:0;font-size:14px;color:#6d28d9"><strong>What is EQB?</strong></p>
<p style="margin:4px 0 0 0;font-size:13px;color:#4b5563">EQB is a <strong>community-based platform</strong> created by students for students. All past questions, solutions, and content are uploaded and maintained by the student community. It works best when everyone contributes.</p>
</td>
</tr>
</table>

<div style="margin:20px 0">
<p style="font-size:15px;font-weight:600;color:#374151;margin:0 0 12px 0">Here's how it works:</p>
<table style="width:100%;border-collapse:collapse">
<tr><td style="padding:6px 0;font-size:14px;color:#4b5563;vertical-align:top;width:28px">📤</td><td style="padding:6px 0;font-size:14px;color:#4b5563"><strong>Upload past questions</strong> — Share what you have so others can benefit. This also keeps your account active.</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#4b5563;vertical-align:top">📖</td><td style="padding:6px 0;font-size:14px;color:#4b5563"><strong>Read &amp; learn</strong> — Browse questions from your programme and others via the Browse feature.</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#4b5563;vertical-align:top">💡</td><td style="padding:6px 0;font-size:14px;color:#4b5563"><strong>Upload solutions</strong> — Help fellow students by sharing your answers and explanations.</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#4b5563;vertical-align:top">⭐</td><td style="padding:6px 0;font-size:14px;color:#4b5563"><strong>Rate solutions</strong> — Upvote or downvote solutions so the best answers rise to the top.</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#4b5563;vertical-align:top">🚩</td><td style="padding:6px 0;font-size:14px;color:#4b5563"><strong>Flag inappropriate content</strong> — Help keep the platform clean by reporting questions that don't match their course.</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#4b5563;vertical-align:top">🔍</td><td style="padding:6px 0;font-size:14px;color:#4b5563"><strong>Browse all programmes</strong> — Access past questions from every programme, not just your own.</td></tr>
</table>
</div>

<div style="margin:20px 0;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px">
<p style="margin:0;font-size:13px;color:#991b1b"><strong>⚠️ Account lockout policy:</strong> To keep EQB active and growing, students who do not upload any past questions within the required period may have their accounts <strong>temporarily locked</strong>. Once locked, you will lose access until you upload a question. This is how we ensure everyone contributes to the community.</p>
</div>

<p style="margin:20px 0 0 0;font-size:14px;color:#4b5563">
  <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Log in to EQB</a>
</p>

<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">

<p style="margin:0;font-size:12px;color:#9ca3af">If you have any questions, send us feedback through the app. Welcome aboard!</p>
<p style="margin:4px 0 0 0;font-size:12px;color:#9ca3af">— The EQB Team</p>
</div>
</div>`;
      await sendEmail(email, "Welcome to EQB — Community Past Questions", welcomeHtml);
    } catch {
      logger.warn({ event: "account.create.welcome_email_failed", message: "Failed to send welcome email", ip, email });
    }

    logger.info({ event: "account.create.success", message: "Account created", ip, email, durationMs: Date.now() - start });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "account.create.error", message: "Unexpected error", ip, error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
