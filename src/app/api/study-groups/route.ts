import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthProfile } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  MAX_GROUPS_PER_COURSE,
  canAccessCourse,
  generateInviteCode,
  notifyGroupCreated,
  type CourseScope,
} from "@/lib/studyGroups";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  course_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "student") return NextResponse.json({ error: "Students only" }, { status: 403 });

  const service = createServiceClient();
  const courseId = req.nextUrl.searchParams.get("course_id");
  const mineOnly = req.nextUrl.searchParams.get("mine") === "true";

  try {
    if (courseId) {
      const { data: groups } = await service
        .from("study_groups")
        .select("id, course_id, name, description, invite_code, created_by, is_active, created_at")
        .eq("course_id", courseId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const groupIds = ((groups ?? []) as Array<{ id: string }>).map((g) => g.id);
      const { data: members } = groupIds.length
        ? await service.from("study_group_members").select("group_id, profile_id").in("group_id", groupIds)
        : { data: [] };
      const { data: myMemberships } = await service
        .from("study_group_members")
        .select("group_id")
        .eq("profile_id", profile.id)
        .in("group_id", groupIds.length ? groupIds : ["00000000-0000-0000-0000-000000000000"]);

      const memberCount = new Map<string, number>();
      for (const m of (members ?? []) as Array<{ group_id: string }>) {
        memberCount.set(m.group_id, (memberCount.get(m.group_id) || 0) + 1);
      }
      const myGroupIds = new Set(((myMemberships ?? []) as Array<{ group_id: string }>).map((m) => m.group_id));

      return NextResponse.json({
        groups: ((groups ?? []) as any[]).map((g) => ({
          ...g,
          member_count: memberCount.get(g.id) || 0,
          is_member: myGroupIds.has(g.id),
        })),
      });
    }

    if (mineOnly) {
      const { data: memberships } = await service
        .from("study_group_members")
        .select("group_id, role, share_name, joined_at")
        .eq("profile_id", profile.id);

      const groupIds = ((memberships ?? []) as Array<{ group_id: string }>).map((m) => m.group_id);
      if (groupIds.length === 0) return NextResponse.json({ groups: [] });

      const { data: groups } = await service
        .from("study_groups")
        .select("*, course:courses(id, code, title, level)")
        .in("id", groupIds)
        .eq("is_active", true);

      const memberMap = new Map(
        ((memberships ?? []) as any[]).map((m) => [m.group_id, m]),
      );

      return NextResponse.json({
        groups: ((groups ?? []) as any[]).map((g) => ({
          ...g,
          my_role: memberMap.get(g.id)?.role,
          my_privacy: {
            share_name: memberMap.get(g.id)?.share_name,
          },
        })),
      });
    }

    return NextResponse.json({ error: "Provide course_id or mine=true" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "study_groups.list_failed", message: msg, userId: profile.id });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "student") return NextResponse.json({ error: "Students only" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { course_id, name, description } = parsed.data;
  const service = createServiceClient();

  try {
    const { data: rawCourse } = await service
      .from("courses")
      .select("id, code, title, level, scope, programme_id")
      .eq("id", course_id)
      .single();
    const course = rawCourse as unknown as CourseScope | null;
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    if (!(await canAccessCourse(profile, course))) {
      return NextResponse.json({ error: "You cannot create a group for this course" }, { status: 403 });
    }

    const { count } = await service
      .from("study_groups")
      .select("id", { count: "exact", head: true })
      .eq("course_id", course_id)
      .eq("is_active", true);
    if ((count ?? 0) >= MAX_GROUPS_PER_COURSE) {
      return NextResponse.json({ error: `Maximum of ${MAX_GROUPS_PER_COURSE} groups per course. Join an existing one instead.` }, { status: 400 });
    }

    const inviteCode = generateInviteCode();
    const { data: group, error: groupError } = await service
      .from("study_groups")
      .insert({
        course_id,
        name: name.trim(),
        description: description?.trim() || null,
        invite_code: inviteCode,
        created_by: profile.id,
        is_active: true,
      })
      .select("id, course_id, name, description, invite_code, created_by, is_active, created_at")
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: groupError?.message || "Failed to create group" }, { status: 500 });
    }

    await service.from("study_group_members").insert({
      group_id: (group as any).id,
      profile_id: profile.id,
      role: "admin",
    });

    await notifyGroupCreated(course, (group as any).name, (group as any).id, profile.id);

    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "study_groups.create_failed", message: msg, userId: profile.id, metadata: { course_id } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
