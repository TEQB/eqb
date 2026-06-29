import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDbRateLimit, hashOtp } from "@/lib/utils";
import { sendOtpSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  const start = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    const body = await req.json();
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn({ event: "otp.send.invalid_input", message: "Invalid OTP request body", ip, metadata: { errors: parsed.error.issues } });
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const { email, fullName, matricNumber, departmentId, currentLevel } = parsed.data;

    const allowedDomain = process.env.NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN;
    if (allowedDomain && !email.toLowerCase().endsWith(allowedDomain)) {
      logger.warn({ event: "otp.send.invalid_domain", message: "Email domain not allowed", ip, email });
      return NextResponse.json({ error: `Only ${allowedDomain} emails are accepted` }, { status: 400 });
    }

    const rateKey = `send-otp:${ip}:${email.toLowerCase()}`;
    if (!(await checkDbRateLimit(rateKey, 3, 60_000))) {
      logger.warn({ event: "otp.send.rate_limited", message: "OTP rate limit hit", ip, email });
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait before trying again." },
        { status: 429 },
      );
    }

    const supabase = createServiceClient();
    const code = generateCode();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase.from("pending_otps").insert({
      email,
      code: codeHash,
      expires_at: expiresAt,
    });

    if (dbError) {
      logger.error({ event: "otp.send.db_error", message: "Failed to store OTP", ip, email, error: dbError.message });
      return NextResponse.json({ error: "Failed to store OTP" }, { status: 500 });
    }

    if (fullName && matricNumber && departmentId && currentLevel) {
      await supabase.from("pending_registrations").upsert({
        email,
        full_name: fullName,
        matric_number: matricNumber,
        department_id: departmentId,
        current_level: currentLevel,
      });
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
        subject: "Your EQB sign-in code",
        html: `<h2>Your sign-in code</h2>
<p>Use the code below to sign in to EQB. It expires in 10 minutes.</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;background:#f3f4f6;border-radius:8px">${code}</p>`,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error({ event: "otp.send.resend_error", message: "Resend API rejected email", ip, email, error: errBody });
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    logger.info({ event: "otp.send.success", message: "OTP sent", ip, email, durationMs: Date.now() - start });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "otp.send.error", message: "Unexpected error", ip, error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
