import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: rawProfile } = await service
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();
  const profile = rawProfile as unknown as { id: string; role: string } | null;
  if (profile?.role !== "super_admin") return null;
  return { user, service, profile };
}

// Admin can delete ANY message in the group (hard delete content, soft-delete row)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } },
) {
  try {
    const session = await assertAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { service, profile } = session;
    const { id: groupId, messageId } = params;

    const { data: message } = await service
      .from("study_group_messages")
      .select("id, group_id, deleted_at")
      .eq("id", messageId)
      .eq("group_id", groupId)
      .maybeSingle();

    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if ((message as any).deleted_at) return NextResponse.json({ success: true, already_deleted: true });

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
      event: "admin.study_group_message_deleted",
      message: "Admin deleted group message",
      userId: profile.id,
      metadata: { groupId, messageId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "admin.study_group_message_delete_failed", message: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
