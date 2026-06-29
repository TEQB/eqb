import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/utils";
import { logger } from "@/lib/logger";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export async function POST(req: Request) {
  const start = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    const { email, password, fullName } = await req.json();
    if (!email || !password || !fullName) {
      logger.warn({ event: "admin.create.invalid_input", message: "Missing admin registration fields", ip });
      return NextResponse.json(
        { error: "Email, full name, and password required" },
        { status: 400 },
      );
    }

    if (!PASSWORD_REGEX.test(password)) {
      logger.warn({ event: "admin.create.weak_password", message: "Admin password too weak", ip, email });
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        },
        { status: 400 },
      );
    }

    const rateKey = `create-admin:${ip}`;
    if (!checkRateLimit(rateKey, 3, 60_000)) {
      logger.warn({ event: "admin.create.rate_limited", message: "Admin creation rate limit hit", ip });
      return NextResponse.json(
        { error: "Too many admin creation attempts. Please wait." },
        { status: 429 },
      );
    }

    if (email !== "ifeoluwa.bankole05@gmail.com") {
      logger.warn({ event: "admin.create.wrong_email", message: "Non-admin email attempted admin registration", ip, email });
      return NextResponse.json(
        { error: "Only the designated admin email can register" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "super_admin")
      .limit(1)
      .single();

    if (existing) {
      logger.warn({ event: "admin.create.already_exists", message: "Admin already registered", ip, email });
      return NextResponse.json(
        { error: "Admin already registered. Go to login." },
        { status: 409 },
      );
    }

    const { data: programmeRow } = await supabase
      .from("departments")
      .select("id")
      .limit(1)
      .single();

    if (!programmeRow) {
      logger.warn({ event: "admin.create.no_programme", message: "No programmes exist for admin registration", ip });
      return NextResponse.json(
        { error: "No programmes exist yet. Seed a programme first via /settings" },
        { status: 400 },
      );
    }

    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      logger.error({ event: "admin.create.user_failed", message: "Supabase admin user creation failed", ip, email, error: createError.message });
      return NextResponse.json(
        { error: "Failed to create admin account" },
        { status: 500 },
      );
    }

    const { data: authUser } = await supabase.auth.admin.listUsers();
    const adminUser = authUser?.users.find((u) => u.email === email);

    if (adminUser) {
      const programmeId = (programmeRow as unknown as { id: string }).id;
      await supabase.from("profiles").insert({
        auth_user_id: adminUser.id,
        full_name: fullName,
        matric_number: "ADMIN0001",
        department_id: programmeId,
        current_level: 100,
        role: "super_admin",
      } as never);
    }

    logger.info({ event: "admin.create.success", message: "Admin account created", ip, email, durationMs: Date.now() - start });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "admin.create.error", message: "Unexpected error", ip, error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
