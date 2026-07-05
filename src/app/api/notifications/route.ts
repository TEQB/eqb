import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function getUserProfileId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: raw } = await service
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  const profile = raw as unknown as { id: string } | null;
  return profile?.id || null;
}

export async function GET(req: NextRequest) {
  try {
    const profileId = await getUserProfileId();
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const unreadOnly = req.nextUrl.searchParams.get("unread_only") === "true";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);

    const service = createServiceClient();
    let query = (service as any)
      .from("notifications")
      .select("id, type, title, body, link, metadata, is_read, created_at")
      .eq("user_id", profileId);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data: raw, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }

    return NextResponse.json({ notifications: raw ?? [] });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profileId = await getUserProfileId();
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { action?: string; id?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { action, id } = body;
    const service = createServiceClient();

    if (action === "mark-read") {
      if (!id) {
        return NextResponse.json({ error: "Notification id required" }, { status: 400 });
      }
      const { error } = await (service as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", profileId);
      if (error) {
        return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "mark-unread") {
      if (!id) {
        return NextResponse.json({ error: "Notification id required" }, { status: 400 });
      }
      const { error } = await (service as any)
        .from("notifications")
        .update({ is_read: false })
        .eq("id", id)
        .eq("user_id", profileId);
      if (error) {
        return NextResponse.json({ error: "Failed to mark as unread" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "mark-all-read") {
      const { error } = await (service as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", profileId)
        .eq("is_read", false);
      if (error) {
        return NextResponse.json({ error: "Failed to mark all as read" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "count") {
      const { count, error } = await (service as any)
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profileId)
        .eq("is_read", false);
      if (error) {
        return NextResponse.json({ count: 0 });
      }
      return NextResponse.json({ count: count ?? 0 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
