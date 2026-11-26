import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

async function sendPushNotification(profileId: string, title: string, body: string, data?: any) {
  const service = createServiceClient();
  const { data: tokens } = await service
    .from("user_device_tokens")
    .select("platform, token")
    .eq("profile_id", profileId)
    .eq("is_active", true);

  const expoTokens = ((tokens ?? []) as any[])
    .filter((t) => t.platform === "ios" || t.platform === "android")
    .map((t) => t.token);

  if (expoTokens.length === 0) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ to: expoTokens, title, body, data: data || {}, sound: "default" }),
  });
}

const MESSAGE_SELECT = "id, group_id, sender_id, content, type, media_url, reply_to_id, deleted_at, created_at";

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: rawProfile } = await service
    .from("profiles")
    .select("id, role, full_name")
    .eq("auth_user_id", user.id)
    .single();
  const profile = rawProfile as unknown as { id: string; role: string; full_name: string | null } | null;
  if (profile?.role !== "super_admin") return null;
  return { user, service, profile };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await assertAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { service } = session;
    const groupId = params.id;

    const { data: messages, error } = await service
      .from("study_group_messages")
      .select(MESSAGE_SELECT)
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) throw error;

    const senderIds = Array.from(new Set(((messages ?? []) as any[]).map((m) => m.sender_id)));
    const { data: profiles } = senderIds.length
      ? await service.from("profiles").select("id, full_name, avatar_url").in("id", senderIds)
      : { data: [] };
    const profileMap = new Map(((profiles ?? []) as any[]).map((p) => [p.id, p]));

    const enriched = ((messages ?? []) as any[]).map((m) => ({
      ...m,
      sender: profileMap.get(m.sender_id) ?? null,
    }));

    return NextResponse.json({ messages: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "admin.study_group_messages_failed", message: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await assertAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { service, profile } = session;
    const groupId = params.id;

    const body = await req.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const type = body.type === "image" ? "image" : "text";
    const mediaUrl = typeof body.media_url === "string" ? body.media_url : null;
    const replyToId = typeof body.reply_to_id === "string" ? body.reply_to_id : null;

    if (type === "text" && !content) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }
    if (type === "image" && !mediaUrl) {
      return NextResponse.json({ error: "Image required" }, { status: 400 });
    }

    const { data: message, error } = await service
      .from("study_group_messages")
      .insert({
        group_id: groupId,
        sender_id: profile.id,
        content: type === "text" ? content : content || null,
        type,
        media_url: mediaUrl,
        reply_to_id: replyToId,
      })
      .select(MESSAGE_SELECT)
      .single();

    if (error) throw error;

    // Notify group members (excluding sender) via push
    const { data: members } = await service
      .from("study_group_members")
      .select("profile_id")
      .eq("group_id", groupId)
      .neq("profile_id", profile.id);

    const memberIds = ((members ?? []) as any[]).map((m) => m.profile_id);
    if (memberIds.length > 0) {
      const preview = type === "image" ? "📷 Photo" : content.slice(0, 80);
      await Promise.all(
        memberIds.map((pid) =>
          sendPushNotification(pid, "EQB Admin", preview, {
            type: "group_message",
            groupId,
          }).catch(() => {}),
        ),
      );
    }

    logger.info({
      event: "admin.study_group_message_sent",
      message: "Admin sent group message",
      userId: profile.id,
      metadata: { groupId },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "admin.study_group_message_failed", message: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
