import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthProfile } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update-privacy"),
    share_name: z.boolean(),
  }),
  z.object({ action: z.literal("leave") }),
  z.object({ action: z.literal("remove-member"), member_id: z.string().uuid() }),
]);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const groupId = params.id;

  try {
    const { data: rawGroup } = await service
      .from("study_groups")
      .select("id, course_id, name, description, invite_code, created_by, is_active, created_at, course:courses(id, code, title, level)")
      .eq("id", groupId)
      .single();
    const group = rawGroup as unknown as any;
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const { data: membership } = await service
      .from("study_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
    }

    const { data: rawMembers } = await service
      .from("study_group_members")
      .select("id, profile_id, role, share_name, joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });

    const memberProfileIds = ((rawMembers ?? []) as Array<{ profile_id: string }>).map((m) => m.profile_id);
    const { data: rawProfiles } = memberProfileIds.length
      ? await service
          .from("profiles")
          .select("id, matric_number, full_name, current_level, programmes(name)")
          .in("id", memberProfileIds)
      : { data: [] };

    const profileMap = new Map(((rawProfiles ?? []) as any[]).map((p) => [p.id, p]));

    const members = ((rawMembers ?? []) as any[]).map((m) => {
      const p = profileMap.get(m.profile_id) as any;
      return {
        membership_id: m.id,
        profile_id: m.profile_id,
        role: m.role,
        joined_at: m.joined_at,
        is_me: m.profile_id === profile.id,
        matric_number: p?.matric_number ?? null,
        // Identity is matric number by default; name only when shared
        full_name: m.share_name ? p?.full_name ?? null : null,
        programme_name: p?.programmes?.name ?? null,
        current_level: p?.current_level ?? null,
        share_name: m.share_name,
      };
    });

    return NextResponse.json({ group, members });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "study_groups.detail_failed", message: msg, userId: profile.id, metadata: { groupId } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const service = createServiceClient();
  const groupId = params.id;

  try {
    const { data: membership } = await service
      .from("study_group_members")
      .select("id, role")
      .eq("group_id", groupId)
      .eq("profile_id", profile.id)
      .maybeSingle();

    const member = membership as { id: string; role: string } | null;

    if (parsed.data.action === "update-privacy") {
      if (!member) return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
      const { error } = await service
        .from("study_group_members")
        .update({
          share_name: parsed.data.share_name,
        })
        .eq("id", member.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (parsed.data.action === "leave") {
      if (!member) return NextResponse.json({ error: "You are not a member of this group" }, { status: 400 });
      const { error } = await service.from("study_group_members").delete().eq("id", member.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (parsed.data.action === "remove-member") {
      if (!member || member.role !== "admin") {
        return NextResponse.json({ error: "Only group admins can remove members" }, { status: 403 });
      }
      if (parsed.data.member_id === profile.id) {
        return NextResponse.json({ error: "Admins cannot remove themselves" }, { status: 400 });
      }
      const { error } = await service
        .from("study_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("profile_id", parsed.data.member_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "study_groups.patch_failed", message: msg, userId: profile.id, metadata: { groupId } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
