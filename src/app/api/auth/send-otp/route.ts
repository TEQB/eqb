import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDbRateLimit, hashOtp } from "@/lib/utils";
import { sendOtpSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/mailer";
import { otpTemplate } from "@/lib/email-templates";

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
      logger.warn({ event: "otp.send.invalid_input", message: "Invalid registration input", ip, email });
      return NextResponse.json({ error: "Invalid registration details" }, { status: 400 });
    }

    const service = createServiceClient();
    if (matricNumber) {
      const { data: existingProfile } = await service
        .from("profiles")
        .select("id")
        .eq("matric_number", matricNumber.trim().toUpperCase())
        .maybeSingle();
      if (existingProfile) {
        logger.warn({ event: "otp.send.duplicate_matric", message: "Matric number already registered", ip, email });
        return NextResponse.json({ error: "This matric number is already registered." }, { status: 409 });
      }
    }

    const rateKey = `send-otp:${ip}:${email.toLowerCase()}`;
    if (!(await checkDbRateLimit(rateKey, 3, 60_000))) {
      logger.warn({ event: "otp.send.rate_limited", message: "OTP rate limit hit", ip, email });
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait before trying again." },
        { status: 429 },
      );
    }

    const code = generateCode();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: dbError } = await service.from("pending_otps").insert({
      email,
      code: codeHash,
      expires_at: expiresAt,
    });

    if (dbError) {
      logger.error({ event: "otp.send.db_error", message: "Failed to store OTP", ip, email, error: dbError.message });
      return NextResponse.json({ error: "Failed to store OTP" }, { status: 500 });
    }

    if (fullName && matricNumber && departmentId && currentLevel) {
      await service.from("pending_registrations").upsert({
        email,
        full_name: fullName,
        matric_number: matricNumber,
        department_id: departmentId,
        current_level: currentLevel,
      });
    }

    try {
      const { subject, html } = otpTemplate(code);
      await sendEmail(email, subject, html);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ event: "otp.send.email_error", message: "Failed to send OTP email", ip, email, error: msg });
      return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
    }

    logger.info({ event: "otp.send.success", message: "OTP sent", ip, email, durationMs: Date.now() - start });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "otp.send.error", message: "Unexpected error", ip, error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
