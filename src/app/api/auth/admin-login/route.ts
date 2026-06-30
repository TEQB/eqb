import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkDbRateLimit } from "@/lib/utils";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const start = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const rateKey = `admin-login:${ip}:${email.toLowerCase()}`;
    if (!(await checkDbRateLimit(rateKey, 5, 60_000))) {
      logger.warn({ event: "admin_login.rate_limited", message: "Admin login rate limited", ip, email });
      return NextResponse.json(
        { error: "Too many login attempts. Please wait before trying again." },
        { status: 429 },
      );
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      logger.warn({ event: "admin_login.failed", message: "Admin login failed", ip, email, error: signInError.message });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Could not verify identity" }, { status: 401 });
    }

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as { role: string } | null;

    if (profile?.role !== "super_admin") {
      await supabase.auth.signOut();
      logger.warn({ event: "admin_login.not_admin", message: "Non-admin user attempted admin login", ip, email });
      return NextResponse.json({ error: "Not authorized as admin" }, { status: 403 });
    }

    logger.info({ event: "admin_login.success", message: "Admin logged in", ip, email, durationMs: Date.now() - start });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "admin_login.error", message: "Unexpected error", ip, error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}