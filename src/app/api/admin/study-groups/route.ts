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

export async function GET(req: NextRequest) {
  try {
    const session = await assertAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { service } = session;

    const { data: groups, error } = await service
      .from("study_groups")
      .select("id, course_id, name, description, invite_code, is_active, created_at, course:courses(code, title)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const groupIds = (groups ?? []).map((g: any) => g.id);

    const [{ data: members }, { data: messages }] = await Promise.all([
      service.from("study_group_members").select("group_id, profile_id, role").in("group_id", groupIds),
      service.from("study_group_messages").select("group_id").in("group_id", groupIds),
    ]);

    const memberCounts = new Map<string, number>();
    const eadminCounts = new Map<string, number>();
    for (const m of (members ?? []) as any[]) {
      memberCounts.set(m.group_id, (memberCounts.get(m.group_id) ?? 0) + 1);
      if (m.role === "e-admin") eadminCounts.set(m.group_id, (eadminCounts.get(m.group_id) ?? 0) + 1);
    }
    const messageCounts = new Map<string, number>();
    for (const m of (messages ?? []) as any[]) {
      messageCounts.set(m.group_id, (messageCounts.get(m.group_id) ?? 0) + 1);
    }

    const result = (groups ?? []).map((g: any) => ({
      ...g,
      member_count: memberCounts.get(g.id) ?? 0,
      eadmin_count: eadminCounts.get(g.id) ?? 0,
      message_count: messageCounts.get(g.id) ?? 0,
    }));

    return NextResponse.json({ groups: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "admin.study_groups_list_failed", message: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
