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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await assertAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { service } = session;
    const groupId = params.id;

    const { data: group, error } = await service
      .from("study_groups")
      .select("id, course_id, name, description, invite_code, is_active, created_at, created_by, course:courses(code, title)")
      .eq("id", groupId)
      .single();
    if (error || !group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const { data: members } = await service
      .from("study_group_members")
      .select("id, profile_id, role, joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });

    const profileIds = Array.from(new Set(((members ?? []) as any[]).map((m) => m.profile_id)));
    const { data: profiles } = profileIds.length
      ? await service.from("profiles").select("id, full_name, matric_number, avatar_url").in("id", profileIds)
      : { data: [] };
    const profileMap = new Map(((profiles ?? []) as any[]).map((p) => [p.id, p]));

    const enrichedMembers = ((members ?? []) as any[]).map((m) => ({
      ...m,
      profile: profileMap.get(m.profile_id) ?? null,
    }));

    return NextResponse.json({ group, members: enrichedMembers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "admin.study_group_detail_failed", message: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await assertAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { service, profile } = session;
    const groupId = params.id;

    const { data: group } = await service
      .from("study_groups")
      .select("id, name, is_active")
      .eq("id", groupId)
      .single();
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // Soft-delete: mark inactive so history is preserved
    const { error } = await service
      .from("study_groups")
      .update({ is_active: false })
      .eq("id", groupId);
    if (error) throw error;

    logger.info({
      event: "admin.study_group_disbanded",
      message: "Admin disbanded study group",
      userId: profile.id,
      metadata: { groupId, name: (group as any).name },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "admin.study_group_disband_failed", message: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
