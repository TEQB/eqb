import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthProfile } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export async function POST(req: NextRequest, { params }: { params: { id: string; messageId: string } }) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const service = createServiceClient();
  const groupId = params.id;
  const messageId = params.messageId;
  const { emoji } = parsed.data;

  try {
    // Verify user is a member of the group
    const { data: membership } = await service
      .from("study_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
    }

    // Verify message exists in this group
    const { data: message } = await service
      .from("study_group_messages")
      .select("id")
      .eq("id", messageId)
      .eq("group_id", groupId)
      .maybeSingle();

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Upsert reaction (remove if same emoji to toggle)
    const { data: existing } = await service
      .from("study_group_message_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("profile_id", profile.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      // Toggle: remove existing reaction
      const { error } = await service
        .from("study_group_message_reactions")
        .delete()
        .eq("id", existing.id);

      if (error) throw error;

      return NextResponse.json({ success: true, action: "removed" });
    } else {
      // Add new reaction
      const { error } = await service
        .from("study_group_message_reactions")
        .insert({
          message_id: messageId,
          profile_id: profile.id,
          emoji,
        });

      if (error) throw error;

      return NextResponse.json({ success: true, action: "added" });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "reaction.failed", message: msg, userId: profile.id, metadata: { groupId, messageId, emoji } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string; messageId: string } }) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const groupId = params.id;
  const messageId = params.messageId;

  try {
    // Verify user is a member of the group
    const { data: membership } = await service
      .from("study_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
    }

    // Get reactions for the message
    const { data: reactions } = await service
      .from("study_group_message_reactions")
      .select("emoji, profile_id, created_at")
      .eq("message_id", messageId);

    // Group by emoji and count
    const reactionMap = new Map<string, { count: number; reactor_ids: string[] }>();
    for (const r of (reactions ?? []) as Array<{ emoji: string; profile_id: string }>) {
      const existing = reactionMap.get(r.emoji) || { count: 0, reactor_ids: [] };
      existing.count++;
      existing.reactor_ids.push(r.profile_id);
      reactionMap.set(r.emoji, existing);
    }

    const result = Array.from(reactionMap.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      reactor_ids: data.reactor_ids,
    }));

    return NextResponse.json({ reactions: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "reactions.get_failed", message: msg, userId: profile.id, metadata: { groupId, messageId } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
