import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDbRateLimit, hashOtp } from "@/lib/utils";
import { verifyResetOtpSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  const start = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    const body = await req.json();
    const parsed = verifyResetOtpSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn({ event: "reset_otp.verify.invalid_input", message: "Invalid verify reset OTP body", ip, metadata: { errors: parsed.error.issues } });
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Email and code required" },
        { status: 400 },
      );
    }

    const { email, code } = parsed.data;

    const rateKey = `verify-reset-otp:${ip}:${email.toLowerCase()}`;
    if (!(await checkDbRateLimit(rateKey, 10, 60_000))) {
      logger.warn({ event: "reset_otp.verify.rate_limited", message: "Verify reset OTP rate limit hit", ip, email });
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait before trying again." },
        { status: 429 },
      );
    }

    const supabase = createServiceClient();
    const codeHash = hashOtp(code);

    const { data: otp, error: fetchError } = await supabase
      .from("password_reset_otps" as never)
      .select("*")
      .eq("email" as never, email)
      .eq("code_hash" as never, codeHash)
      .eq("used" as never, false)
      .gte("expires_at" as never, new Date().toISOString())
      .order("created_at" as never, { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otp) {
      logger.warn({ event: "reset_otp.verify.invalid_code", message: "Invalid or expired password reset OTP", ip, email });
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    }

    const otpRow = otp as unknown as { id: string };

    await supabase
      .from("password_reset_otps" as never)
      .update({ used: true } as never)
      .eq("id" as never, otpRow.id);

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashOtp(rawToken);
    const tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: tokenError } = await supabase.from("password_reset_tokens" as never).insert({
      email,
      token_hash: tokenHash,
      expires_at: tokenExpiresAt,
    } as never);

    if (tokenError) {
      logger.error({ event: "reset_otp.verify.token_db_error", message: "Failed to store password reset token", ip, email, error: tokenError.message });
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    logger.info({ event: "reset_otp.verify.success", message: "Password reset OTP verified", ip, email, durationMs: Date.now() - start });

    return NextResponse.json({ success: true, token: rawToken });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "reset_otp.verify.error", message: "Unexpected error", ip, error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
