import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  _req: NextRequest,
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

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bucket = decoded.startsWith("solutions/") ? "solutions" : "approved";
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

  return new NextResponse(data, {
    headers: {
      "Content-Type": mimeTypes[ext || ""] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
