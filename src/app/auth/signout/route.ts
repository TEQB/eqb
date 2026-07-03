import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();
  const loginUrl = new URL("/login", req.url);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set("eqb_voluntary_logout", "1", {
    maxAge: 30,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
