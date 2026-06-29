import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
    "/dashboard/:path*",
    "/browse/:path*",
    "/course/:path*",
    "/question/:path*",
    "/upload/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
