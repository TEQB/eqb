import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthProfile } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { sanitizeMessageContent } from "@/lib/studyGroups";

const messageSchema = z.object({
  content: z.string().max(2000).optional(),
  type: z.enum(["text", "image", "voice"]).default("text"),
  media_url: z.string().nullable().optional(),
  reply_to_id: z.string().uuid().nullable().optional(),
});

const MESSAGE_SELECT = "id, group_id, sender_id, content, type, media_url, reply_to_id, deleted_at, created_at";

// Simple in-memory push notification sender (for production, use Firebase Cloud Messaging or OneSignal)
async function sendPushNotification(profileId: string, title: string, body: string, data?: any) {
  const service = createServiceClient();
  const { data: tokens } = await service
    .from("user_device_tokens")
    .select("platform, token")
    .eq("profile_id", profileId)
    .eq("is_active", true);

  if (!tokens || tokens.length === 0) return;

  // For Expo mobile apps
  const expoTokens = (tokens as any[])
    .filter((t) => t.platform === "ios" || t.platform === "android")
    .map((t) => t.token);

  if (expoTokens.length > 0) {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          to: expoTokens,
          title,
          body,
          data: data || {},
          sound: "default",
        }),
      });
    } catch (e) {
      logger.error({ event: "push_notification.expo_failed", message: String(e) });
    }
  }

  // For web (Service Worker VAPID)
  const webTokens = (tokens as any[]).filter((t) => t.platform === "web").map((t) => t.token);
  // Web push requires VAPID keys and Web Push Protocol - implement if needed
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const groupId = params.id;

  try {
    const { data: membership } = await service
      .from("study_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
    }

    const { data, error } = await service
      .from("study_group_messages")
      .select(MESSAGE_SELECT)
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const messages = (data ?? []).slice().reverse();

    // Fetch read receipts and reactions for all messages
    const messageIds = messages.map((m: any) => m.id);
    const [readReceipts, reactions] = await Promise.all([
      messageIds.length
        ? service
            .from("study_group_message_reads")
            .select("message_id, profile_id, read_at")
            .in("message_id", messageIds)
        : { data: [] },
      messageIds.length
        ? service
            .from("study_group_message_reactions")
            .select("message_id, emoji, profile_id")
            .in("message_id", messageIds)
        : { data: [] },
    ]);

    // Group reads and reactions by message_id
    const readsMap = new Map<string, Array<{ profile_id: string; read_at: string }>>();
    for (const r of (readReceipts.data ?? []) as Array<{ message_id: string; profile_id: string; read_at: string }>) {
      const existing = readsMap.get(r.message_id) || [];
      existing.push({ profile_id: r.profile_id, read_at: r.read_at });
      readsMap.set(r.message_id, existing);
    }

    const reactionsMap = new Map<string, Array<{ emoji: string; profile_id: string }>>();
    for (const r of (reactions.data ?? []) as Array<{ message_id: string; emoji: string; profile_id: string }>) {
      const existing = reactionsMap.get(r.message_id) || [];
      existing.push({ emoji: r.emoji, profile_id: r.profile_id });
      reactionsMap.set(r.message_id, existing);
    }

    // Attach reads and reactions to messages
    const enrichedMessages = messages.map((m: any) => ({
      ...m,
      read_by: readsMap.get(m.id) || [],
      reactions: reactionsMap.get(m.id) || [],
    }));

    return NextResponse.json({ messages: enrichedMessages });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "study_groups.messages_load_failed", message: msg, userId: profile.id, metadata: { groupId } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { content, type, media_url, reply_to_id } = parsed.data;

  // Text messages require content; media messages require media_url
  if (type === "text" && !content?.trim()) {
    return NextResponse.json({ error: "Text messages require content" }, { status: 400 });
  }
  if ((type === "image" || type === "voice") && !media_url) {
    return NextResponse.json({ error: "Media messages require media_url" }, { status: 400 });
  }

  // Sanitize content to block phone numbers and account numbers
  if (content) {
    const { hasRestricted } = sanitizeMessageContent(content);
    if (hasRestricted) {
      return NextResponse.json(
        { error: "For privacy, phone numbers and account numbers are not allowed in messages" },
        { status: 400 },
      );
    }
  }

  const service = createServiceClient();
  const groupId = params.id;

  try {
    // Verify membership
    const { data: membership } = await service
      .from("study_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
    }

    // If replying, verify the target message exists and is in the same group
    if (reply_to_id) {
      const { data: targetMsg } = await service
        .from("study_group_messages")
        .select("id, group_id")
        .eq("id", reply_to_id)
        .single();
      if (!targetMsg || targetMsg.group_id !== groupId) {
        return NextResponse.json({ error: "Invalid reply target" }, { status: 400 });
      }
    }

    const { data: message, error } = await service
      .from("study_group_messages")
      .insert({
        group_id: groupId,
        sender_id: profile.id,
        content: content?.trim() || null,
        type,
        media_url,
        reply_to_id,
      })
      .select(MESSAGE_SELECT)
      .single();

    if (error) throw error;

    logger.info({
      event: "study_groups.message_sent",
      message: "Message sent to study group",
      userId: profile.id,
      metadata: { groupId, type },
    });

    // Send push notifications to other group members
    const { data: groupMembers } = await service
      .from("study_group_members")
      .select("profile_id")
      .eq("group_id", groupId)
      .neq("profile_id", profile.id);

    if (groupMembers && groupMembers.length > 0) {
      const { data: groupInfo } = await service
        .from("study_groups")
        .select("name")
        .eq("id", groupId)
        .single();

      const groupName = (groupInfo as any)?.name || "Study Group";
      const messagePreview = type === "image" ? "📷 Photo" : (content?.substring(0, 50) || "Message");

      for (const member of groupMembers as Array<{ profile_id: string }>) {
        await sendPushNotification(
          member.profile_id,
          groupName,
          `${profile.full_name || profile.matric_number}: ${messagePreview}`,
          { groupId, messageId: message.id, type: "study_group_message" },
        );
      }
    }

    return NextResponse.json({ success: true, message });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "study_groups.message_failed", message: msg, userId: profile.id, metadata: { groupId } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
