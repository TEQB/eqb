import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter for edge/runtime constraints.
// Key = IP address, value = { count, windowStart }.
// Fixed 15-minute sliding window, 30 auth attempts max per IP.
const authRateLimitMap = new Map<
  string,
  { count: number; windowStart: number }
>();
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX = 30;

function checkAuthRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const record = authRateLimitMap.get(ip);
  if (!record || now - record.windowStart >= AUTH_RATE_LIMIT_WINDOW_MS) {
    authRateLimitMap.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (record.count >= AUTH_RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil(
      (AUTH_RATE_LIMIT_WINDOW_MS - (now - record.windowStart)) / 1000,
    );
    return { allowed: false, retryAfterSeconds: retryAfter };
  }
  record.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function middleware(request: NextRequest) {
  const { pathname, protocol } = request.nextUrl;

  // ── HTTPS redirect (production only) ──
  if (
    process.env.NODE_ENV === "production" &&
    protocol === "http:" &&
    !request.headers.get("x-forwarded-proto")?.startsWith("https")
  ) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https";
    return NextResponse.redirect(httpsUrl);
  }

  // ── Auth route rate limiting (POST only, no DB needed at edge) ──
  if (
    request.method === "POST" &&
    pathname.startsWith("/api/auth/")
  ) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const { allowed, retryAfterSeconds } = checkAuthRateLimit(ip);
    if (!allowed) {
      const response = NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
      response.headers.set("Retry-After", String(retryAfterSeconds));
      return response;
    }
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminSecret = process.env.ADMIN_SECRET_PATH;
  const isAdminLogin =
    adminSecret && pathname === `/admin/${adminSecret}/login`;
  const isAdminRoot =
    adminSecret && pathname === `/admin/${adminSecret}`;

  const isStudentRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/browse") ||
    pathname.startsWith("/course") ||
    pathname.startsWith("/question") ||
    pathname.startsWith("/profile");

  const isUploadRoute = pathname.startsWith("/upload");
  const isAdminRoute = pathname.startsWith("/admin") && !isAdminLogin && !isAdminRoot;

  if (isStudentRoute || isUploadRoute) {
    if (!user) {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      console.log(
        `[EQB] ${JSON.stringify({ t: new Date().toISOString(), lvl: "warn", ev: "auth.unauthorized", msg: "Redirected unauthenticated user to login", ip, p: pathname })}`,
      );
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (!isUploadRoute) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_locked")
        .eq("auth_user_id", user.id)
        .single();

      if (profile?.is_locked) {
        console.log(
          `[EQB] ${JSON.stringify({ t: new Date().toISOString(), lvl: "info", ev: "auth.locked", msg: "Redirected locked user to upload", uid: user.id, p: pathname })}`,
        );
        return NextResponse.redirect(new URL("/upload?locked=true", request.url));
      }
    }
  }

  if (isAdminRoute) {
    if (!user) {
      const loginUrl = adminSecret
        ? `/admin/${adminSecret}/login`
        : "/login";
      console.log(
        `[EQB] ${JSON.stringify({ t: new Date().toISOString(), lvl: "warn", ev: "auth.admin_unauthorized", msg: "Redirected unauthenticated user from admin route", ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown", p: pathname })}`,
      );
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      console.log(
        `[EQB] ${JSON.stringify({ t: new Date().toISOString(), lvl: "warn", ev: "auth.admin_forbidden", msg: "Non-admin user attempted admin route", uid: user.id, p: pathname })}`,
      );
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/api/auth/:path*",
    "/dashboard/:path*",
    "/browse/:path*",
    "/course/:path*",
    "/question/:path*",
    "/upload/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
