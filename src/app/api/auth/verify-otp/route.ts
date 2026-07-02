import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit, hashOtp } from "@/lib/utils";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const start = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      logger.warn({ event: "otp.verify.invalid_input", message: "Missing email or code", ip });
      return NextResponse.json({ error: "Email and code required" }, { status: 400 });
    }

    const rateKey = `verify-otp:${ip}:${email.toLowerCase()}`;
    if (!checkRateLimit(rateKey, 10, 60_000)) {
      logger.warn({ event: "otp.verify.rate_limited", message: "Verify OTP rate limit hit", ip, email });
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait before trying again." },
        { status: 429 },
      );
    }

    const supabase = createServiceClient();
    const codeHash = hashOtp(code);

    const { data: otp, error: fetchError } = await supabase
      .from("pending_otps")
      .select("*")
      .eq("email", email)
      .eq("code", codeHash)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otp) {
      logger.warn({ event: "otp.verify.invalid_code", message: "Invalid or expired OTP", ip, email });
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    }

    await supabase
      .from("pending_otps")
      .update({ used: true })
      .eq("id", otp.id);

    const { data: reg } = await supabase
      .from("pending_registrations")
      .select("*")
      .eq("email", email)
      .single();

    logger.info({ event: "otp.verify.success", message: "OTP verified", ip, email, durationMs: Date.now() - start });

    return NextResponse.json({
      success: true,
      hasPendingRegistration: !!reg,
      registration: reg
        ? {
            fullName: reg.full_name,
            matricNumber: reg.matric_number,
            programmeId: reg.department_id,
            currentLevel: reg.current_level,
          }
        : null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "otp.verify.error", message: "Unexpected error", ip, error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
