import { NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

export interface AuthProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  matric_number: string | null;
  programme_id: string;
  current_level: number;
  role: string;
  phone_number: string | null;
  bank_account_number: string | null;
}

/**
 * Resolve the authenticated user's profile from either:
 *  - a cookie-based Supabase session (web browser), or
 *  - an `Authorization: Bearer <supabase_access_token>` header (mobile app).
 *
 * Returns null when unauthenticated.
 */
export async function getAuthProfile(req: NextRequest): Promise<AuthProfile | null> {
  let userId: string | null = null;

  // 1. Try cookie session (web)
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  // 2. Fall back to bearer token (mobile)
  if (!userId) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token) {
      try {
        const anon = createSupabaseClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        const { data } = await anon.auth.getUser(token);
        userId = data.user?.id ?? null;
      } catch {
        userId = null;
      }
    }
  }

  if (!userId) return null;

  const service = createServiceClient();
  const { data: raw } = await service
    .from("profiles")
    .select("id, auth_user_id, full_name, matric_number, programme_id, current_level, role, phone_number, bank_account_number")
    .eq("auth_user_id", userId)
    .single();

  return (raw as unknown as AuthProfile) ?? null;
}
