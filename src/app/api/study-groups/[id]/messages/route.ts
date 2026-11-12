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

    const { error } = await service.from("study_group_messages").insert({
      group_id: groupId,
      sender_id: profile.id,
      content: content?.trim() || null,
      type,
      media_url,
      reply_to_id,
    });

    if (error) throw error;

    logger.info({
      event: "study_groups.message_sent",
      message: "Message sent to study group",
      userId: profile.id,
      metadata: { groupId, type },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "study_groups.message_failed", message: msg, userId: profile.id, metadata: { groupId } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
