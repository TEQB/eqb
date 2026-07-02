import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type ActivityLevel = "info" | "warn" | "error";

type ActivityPayload = {
  event?: unknown;
  message?: unknown;
  level?: unknown;
  path?: unknown;
  method?: unknown;
  durationMs?: unknown;
  error?: unknown;
  metadata?: unknown;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

function cleanText(value: unknown, max = 200) {
  if (typeof value !== "string") return "";
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? text.slice(0, max) : text;
}

function cleanLevel(value: unknown): ActivityLevel {
  if (value === "warn" || value === "error") return value;
  return "info";
}

function cleanInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function cleanMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function activityLogsDb(supabase: ReturnType<typeof createServiceClient>) {
  return (supabase as unknown as AnySupabase).from("activity_logs");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as ActivityPayload | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid activity payload" }, { status: 400 });
    }

    const event = cleanText(body.event, 100);
    const message = cleanText(body.message, 400);
    if (!event || !message) {
      return NextResponse.json({ error: "Missing activity event or message" }, { status: 400 });
    }

    const serverHeaders = headers();
    const forwardedFor = serverHeaders.get("x-forwarded-for");
    const ip = cleanText(forwardedFor?.split(",")[0] || serverHeaders.get("x-real-ip"), 64) || null;
    const userAgent = cleanText(serverHeaders.get("user-agent"), 255) || null;

    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        userEmail = user.email ?? null;
      }
    } catch {
      // Anonymous activity should still be logged.
    }

    const supabase = createServiceClient();
    const { error } = await activityLogsDb(supabase).insert({
      event,
      message,
      level: cleanLevel(body.level),
      ip,
      user_id: userId,
      user_email: userEmail,
      path: cleanText(body.path, 255) || null,
      method: cleanText(body.method, 32) || null,
      duration_ms: cleanInteger(body.durationMs),
      error_message: cleanText(body.error, 1000) || null,
      metadata: cleanMetadata(body.metadata),
      user_agent: userAgent,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record activity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
