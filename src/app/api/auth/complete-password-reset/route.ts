import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDbRateLimit, hashOtp } from "@/lib/utils";
import { completePasswordResetSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { withAuthRetry, serializeAuthError, isTransientAuthError } from "@/lib/supabase/admin-retry";

export async function POST(req: Request) {
  const start = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    const body = await req.json();
    const parsed = completePasswordResetSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn({ event: "reset_password.complete.invalid_input", message: "Invalid complete password reset body", ip, metadata: { errors: parsed.error.issues } });
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const { email, token, password } = parsed.data;

    const rateKey = `complete-password-reset:${ip}:${email.toLowerCase()}`;
    if (!(await checkDbRateLimit(rateKey, 5, 60_000))) {
      logger.warn({ event: "reset_password.complete.rate_limited", message: "Complete password reset rate limit hit", ip, email });
      return NextResponse.json(
        { error: "Too many attempts. Please wait before trying again." },
        { status: 429 },
      );
    }

    const supabase = createServiceClient();
    const tokenHash = hashOtp(token);

    const { data: storedToken, error: tokenFetchError } = await supabase
      .from("password_reset_tokens" as never)
      .select("*")
      .eq("token_hash" as never, tokenHash)
      .eq("email" as never, email)
      .eq("used" as never, false)
      .gte("expires_at" as never, new Date().toISOString())
      .order("created_at" as never, { ascending: false })
      .limit(1)
      .single();

    if (tokenFetchError || !storedToken) {
      logger.warn({ event: "reset_password.complete.invalid_token", message: "Invalid or expired password reset token", ip, email });
      return NextResponse.json({ error: "Verification expired. Please request a new code." }, { status: 401 });
    }

    const tokenRow = storedToken as unknown as { id: string };

    const { data: authUsers, error: listErr } = await withAuthRetry(() =>
      supabase.auth.admin.listUsers({ perPage: 1000 })
    );

    if (listErr) {
      logger.error({ event: "reset_password.complete.list_users_failed", message: "Failed to list auth users", ip, email, error: listErr.message, metadata: { supabaseError: serializeAuthError(listErr) } });

      if (isTransientAuthError(listErr)) {
        return NextResponse.json({ error: "Our authentication provider is temporarily unavailable. Please try again in a few minutes." }, { status: 503 });
      }

      return NextResponse.json({ error: "Could not update password" }, { status: 500 });
    }

    const authUser = authUsers?.users?.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    if (!authUser) {
      logger.warn({ event: "reset_password.complete.user_not_found", message: "User no longer exists", ip, email });
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const { error: updateErr } = await withAuthRetry(() =>
      supabase.auth.admin.updateUserById(authUser.id, { password })
    );

    if (updateErr) {
      logger.error({ event: "reset_password.complete.update_failed", message: "Failed to update password", ip, email, error: updateErr.message, metadata: { supabaseError: serializeAuthError(updateErr) } });

      if (isTransientAuthError(updateErr)) {
        return NextResponse.json({ error: "Our authentication provider is temporarily unavailable. Please try again in a few minutes." }, { status: 503 });
      }

      return NextResponse.json({ error: "Could not update password" }, { status: 500 });
    }

    await supabase
      .from("password_reset_tokens" as never)
      .update({ used: true } as never)
      .eq("id" as never, tokenRow.id);

    logger.info({ event: "reset_password.complete.success", message: "Password reset completed", ip, email, durationMs: Date.now() - start });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "reset_password.complete.error", message: "Unexpected error", ip, error: msg, durationMs: Date.now() - start });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
