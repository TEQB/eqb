import { NextRequest, NextResponse } from "next/server";
import { getAuthProfile } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest, { params }: { params: { id: string; messageId: string } }) {
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

    // Upsert read receipt
    const { error } = await service
      .from("study_group_message_reads")
      .upsert({
        message_id: messageId,
        profile_id: profile.id,
        read_at: new Date().toISOString(),
      }, {
        onConflict: "message_id,profile_id",
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "read_receipt.failed", message: msg, userId: profile.id, metadata: { groupId, messageId } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
