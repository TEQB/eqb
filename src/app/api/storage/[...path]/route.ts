import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { applyWatermark } from "@/lib/watermark";

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const rawPath = params.path.join("/");
  const normalized = rawPath.replace(/\\/g, "/");
  const decoded = normalized.split("/").map(decodeURIComponent).join("/");

  if (
    !decoded.startsWith("approved/") &&
    !decoded.startsWith("solutions/")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (decoded.includes("..") || decoded.includes("~")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedExt = /\.(jpg|jpeg|png|pdf)$/i;
  if (!allowedExt.test(decoded)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bucket = decoded.startsWith("solutions/") ? "solutions" : "approved";

  if (bucket === "solutions") {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(bucket)
    .download(decoded);

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = decoded.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    pdf: "application/pdf",
  };

  const wantsWatermark = req.nextUrl.searchParams.get("wm") === "1";
  const isImage = ext === "jpg" || ext === "jpeg" || ext === "png";

  let responseBody: Blob = data;

  if (wantsWatermark && isImage) {
    try {
      const buffer = Buffer.from(await data.arrayBuffer());
      const wmBuffer = await applyWatermark(buffer);
      const ab = wmBuffer.buffer as ArrayBuffer;
      responseBody = new Blob([ab], {
        type: mimeTypes[ext || ""] || "application/octet-stream",
      });
    } catch {
      // Never fail over a watermarking bug — fall back to plain image.
    }
  }

  return new NextResponse(responseBody, {
    headers: {
      "Content-Type": mimeTypes[ext || ""] || "application/octet-stream",
      "Cache-Control": wantsWatermark
        ? "public, max-age=3600"
        : "public, max-age=31536000, immutable",
    },
  });
}
