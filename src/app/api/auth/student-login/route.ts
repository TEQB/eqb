import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDbRateLimit } from "@/lib/utils";
import { loginSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const start = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const email = parsed.data.email.trim();
    const { password } = parsed.data;

    const rateKey = `student-login:${ip}:${email.toLowerCase()}`;
    if (!(await checkDbRateLimit(rateKey, 5, 60_000))) {
      logger.warn({
        event: "student_login.rate_limited",
        message: "Student login rate limited",
        ip,
        email,
      });
      return NextResponse.json(
        { error: "Too many login attempts. Please wait before trying again." },
        { status: 429 },
      );
    }

    const service = createServiceClient();
    const { data: authUsers } = await service.auth.admin.listUsers({ perPage: 1000 });
    const authUser = authUsers?.users?.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    if (!authUser) {
      logger.warn({
        event: "student_login.no_account",
        message: "Login attempted for unknown email",
        ip,
        email,
      });
      return NextResponse.json(
        { code: "no_account", error: "No account found for this email." },
        { status: 401 },
      );
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      logger.warn({
        event: "student_login.invalid_credentials",
        message: "Student login failed — bad password",
        ip,
        email,
        error: signInError.message,
      });
      return NextResponse.json(
        { code: "invalid_credentials", error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { code: "invalid_credentials", error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as { role: string } | null;

    if (profile?.role !== "student") {
      await supabase.auth.signOut();
      logger.warn({
        event: "student_login.not_student",
        message: "Non-student attempted student login",
        ip,
        email,
        metadata: { role: profile?.role },
      });
      return NextResponse.json(
        { code: "invalid_credentials", error: "Invalid email or password." },
        { status: 401 },
      );
    }

    logger.info({
      event: "student_login.success",
      message: "Student logged in",
      ip,
      email,
      userId: user.id,
      durationMs: Date.now() - start,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({
      event: "student_login.error",
      message: "Unexpected student login error",
      ip,
      error: msg,
      durationMs: Date.now() - start,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
