import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthProfile } from "@/lib/apiAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

const tokenSchema = z.object({
  platform: z.enum(["ios", "android", "web"]),
  token: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = tokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const service = createServiceClient();
  const { platform, token } = parsed.data;

  try {
    // Upsert device token
    const { error } = await service
      .from("user_device_tokens")
      .upsert({
        profile_id: profile.id,
        platform,
        token,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "profile_id,platform,token",
      });

    if (error) throw error;

    logger.info({
      event: "push_token.registered",
      message: "Device token registered",
      userId: profile.id,
      metadata: { platform },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "push_token.registration_failed", message: msg, userId: profile.id });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const profile = await getAuthProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = tokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const service = createServiceClient();
  const { platform, token } = parsed.data;

  try {
    const { error } = await service
      .from("user_device_tokens")
      .update({ is_active: false })
      .eq("profile_id", profile.id)
      .eq("platform", platform)
      .eq("token", token);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ event: "push_token.deletion_failed", message: msg, userId: profile.id });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
