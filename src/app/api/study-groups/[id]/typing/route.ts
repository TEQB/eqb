import { NextRequest, NextResponse } from "next/server";
import { getAuthProfile } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const groupId = params.id;

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

    // Get typing users (expired ones are filtered out)
    const { data: typingUsers } = await service
      .from("study_group_typing")
      .select("profile_id, typing_at")
      .eq("group_id", groupId)
      .gt("typing_at", new Date(Date.now() - 30000).toISOString()) // Last 30 seconds
      .order("typing_at", { ascending: false });

    // Get profile details for typing users
    const profileIds = (typingUsers ?? []).map((t: any) => t.profile_id);
    const { data: profiles } = profileIds.length
      ? await service
          .from("profiles")
          .select("id, full_name, matric_number")
          .in("id", profileIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const result = (typingUsers ?? [])
      .map((t: any) => {
        const p = profileMap.get(t.profile_id);
        return {
          profile_id: t.profile_id,
          full_name: p?.full_name || null,
          matric_number: p?.matric_number || null,
          typing_at: t.typing_at,
        };
      })
      .filter((t: any) => t.profile_id !== profile.id); // Don't include self

    return NextResponse.json({ typing_users: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "typing_indicator.get_failed", message: msg, userId: profile.id, metadata: { groupId } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const groupId = params.id;

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

    // Upsert typing indicator (updates typing_at timestamp)
    const { error } = await service
      .from("study_group_typing")
      .upsert({
        group_id: groupId,
        profile_id: profile.id,
        typing_at: new Date().toISOString(),
      }, {
        onConflict: "group_id,profile_id",
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "typing_indicator.failed", message: msg, userId: profile.id, metadata: { groupId } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const groupId = params.id;

  try {
    // Remove typing indicator
    const { error } = await service
      .from("study_group_typing")
      .delete()
      .eq("group_id", groupId)
      .eq("profile_id", profile.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "typing_indicator.delete_failed", message: msg, userId: profile.id, metadata: { groupId } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
