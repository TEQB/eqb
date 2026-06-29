import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDbRateLimit } from "@/lib/utils";
import { logger } from "@/lib/logger";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export async function POST(req: Request) {
  const start = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      logger.warn({ event: "account.create.invalid_input", message: "Missing email or password", ip });
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const allowedDomain = process.env.NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN;
    if (allowedDomain && !email.toLowerCase().endsWith(allowedDomain)) {
      logger.warn({ event: "account.create.invalid_domain", message: "Email domain not allowed", ip, email });
      return NextResponse.json({ error: `Only ${allowedDomain} emails are accepted` }, { status: 400 });
    }

    if (!PASSWORD_REGEX.test(password)) {
      logger.warn({ event: "account.create.weak_password", message: "Password does not meet strength requirements", ip, email });
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        },
        { status: 400 },
      );
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

    const { data: reg } = await supabase
      .from("pending_registrations")
      .select("*")
      .eq("email", email)
      .single();

    if (!reg) {
      logger.warn({ event: "account.create.no_pending", message: "No pending registration found", ip, email });
      return NextResponse.json({ error: "No pending registration" }, { status: 400 });
    }

    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: reg.full_name,
        matric_number: reg.matric_number,
        department_id: reg.department_id,
        current_level: reg.current_level,
      },
    });

    if (createError) {
      logger.error({ event: "account.create.failed", message: "Failed to create account via Supabase admin", ip, email, error: createError.message });
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    await supabase.from("pending_registrations").delete().eq("email", email);

    logger.info({ event: "account.create.success", message: "Account created", ip, email, durationMs: Date.now() - start });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "account.create.error", message: "Unexpected error", ip, error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
