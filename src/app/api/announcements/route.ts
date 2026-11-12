import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthProfile } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { validateUUID } from "@/lib/utils";

const markSchema = z.object({
  announcement_id: z.string().uuid(),
  action: z.enum(["shown", "dismiss"]),
});

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  display_type: string;
  duration_type: string;
  duration_value: number;
  created_at: string;
  expires_at: string | null;
}

export async function GET(req: NextRequest) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  const { data: announcements } = await service
    .from("announcements")
    .select("id, title, body, display_type, duration_type, duration_value, created_at, expires_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const rows = (announcements ?? []) as unknown as AnnouncementRow[];
  const now = Date.now();
  const active = rows.filter(
    (a) => !a.expires_at || new Date(a.expires_at).getTime() > now,
  );
  if (active.length === 0) return NextResponse.json({ announcements: [] });

  // For "show once" announcements, exclude ones this user has already seen
  const onceIds = active.filter((a) => a.duration_type === "once").map((a) => a.id);
  const seen = new Set<string>();
  if (onceIds.length > 0) {
    const { data: reads } = await service
      .from("announcement_reads")
      .select("announcement_id")
      .eq("profile_id", profile.id)
      .in("announcement_id", onceIds);
    for (const r of (reads ?? []) as Array<{ announcement_id: string }>) {
      seen.add(r.announcement_id);
    }
  }

  const visible = active.filter(
    (a) => a.duration_type !== "once" || !seen.has(a.id),
  );

  return NextResponse.json({ announcements: visible });
}

export async function POST(req: NextRequest) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = markSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!validateUUID(parsed.data.announcement_id)) {
    return NextResponse.json({ error: "Invalid announcement id" }, { status: 400 });
  }

  const service = createServiceClient();
  const now = new Date().toISOString();

  if (parsed.data.action === "shown") {
    const { error } = await service
      .from("announcement_reads")
      .upsert(
        { announcement_id: parsed.data.announcement_id, profile_id: profile.id, first_shown_at: now },
        { onConflict: "announcement_id,profile_id", ignoreDuplicates: true },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await service
      .from("announcement_reads")
      .upsert(
        {
          announcement_id: parsed.data.announcement_id,
          profile_id: profile.id,
          first_shown_at: now,
          dismissed_at: now,
        },
        { onConflict: "announcement_id,profile_id" },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
