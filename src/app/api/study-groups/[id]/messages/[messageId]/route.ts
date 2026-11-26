import { NextRequest, NextResponse } from "next/server";
import { getAuthProfile } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } },
) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const groupId = params.id;
  const messageId = params.messageId;

  try {
    const { data: message } = await service
      .from("study_group_messages")
      .select("id, sender_id, group_id, deleted_at")
      .eq("id", messageId)
      .eq("group_id", groupId)
      .maybeSingle();

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.sender_id !== profile.id) {
      return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
    }

    if (message.deleted_at) {
      return NextResponse.json({ success: true, already_deleted: true });
    }

    const { error } = await service
      .from("study_group_messages")
      .update({
        deleted_at: new Date().toISOString(),
        content: null,
        media_url: null,
      })
      .eq("id", messageId);

    if (error) throw error;

    logger.info({
      event: "study_groups.message_deleted",
      message: "Message deleted",
      userId: profile.id,
      metadata: { groupId, messageId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "study_groups.message_delete_failed", message: msg, userId: profile.id, metadata: { groupId, messageId } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
