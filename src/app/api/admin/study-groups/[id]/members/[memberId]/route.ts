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

// Remove a member (or change role) from a group — admin full access
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } },
) {
  try {
    const session = await assertAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { service, profile } = session;
    const { id: groupId, memberId } = params;

    const { data: member } = await service
      .from("study_group_members")
      .select("id, profile_id, role")
      .eq("id", memberId)
      .eq("group_id", groupId)
      .maybeSingle();

    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Prevent removing self or the last group admin
    if ((member as any).profile_id === profile.id) {
      return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
    }
    if ((member as any).role === "admin") {
      const { count } = await service
        .from("study_group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", groupId)
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: "Cannot remove the last group admin" }, { status: 400 });
      }
    }

    const { error } = await service
      .from("study_group_members")
      .delete()
      .eq("id", memberId);

    if (error) throw error;

    logger.info({
      event: "admin.study_group_member_removed",
      message: "Admin removed group member",
      userId: profile.id,
      metadata: { groupId, memberId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "admin.study_group_member_remove_failed", message: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Promote/demote a member's role
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } },
) {
  try {
    const session = await assertAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { service, profile } = session;
    const { id: groupId, memberId } = params;

    const body = await req.json();
    const role = body.role;
    if (!["admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { data: member } = await service
      .from("study_group_members")
      .select("id, role")
      .eq("id", memberId)
      .eq("group_id", groupId)
      .maybeSingle();
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const { error } = await service
      .from("study_group_members")
      .update({ role })
      .eq("id", memberId);

    if (error) throw error;

    logger.info({
      event: "admin.study_group_member_role_changed",
      message: "Admin changed member role",
      userId: profile.id,
      metadata: { groupId, memberId, role },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "admin.study_group_member_role_failed", message: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
