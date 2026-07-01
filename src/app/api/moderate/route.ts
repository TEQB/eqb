import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateFile, checkDbRateLimit } from "@/lib/utils";
import { moderateSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const supabase = createClient();
    const service = createServiceClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      logger.warn({ event: "moderate.unauthorized", message: "Unauthorized moderate attempt", ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkDbRateLimit(`moderate:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS))) {
      logger.warn({ event: "moderate.rate_limited", message: "Moderate rate limit hit", userId: user.id });
      return NextResponse.json(
        { error: "Too many requests. Please wait before uploading again." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = moderateSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn({ event: "moderate.invalid_input", message: "Invalid moderate request body", userId: user.id, metadata: { errors: parsed.error.issues } });
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const { questionId, courseCode, courseName } = parsed.data;

    const { data: rawQuestion } = await service
      .from("past_questions")
      .select("file_url, file_type, uploaded_by, status, year, semester")
      .eq("id", questionId)
      .single();
    const question = rawQuestion as unknown as {
      file_url: string;
      file_type: string;
      uploaded_by: string;
      status: string;
      year: number;
      semester: string;
    } | null;

    if (!question) {
      logger.warn({ event: "moderate.not_found", message: "Question not found", userId: user.id, metadata: { questionId } });
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: rawProfile } = await service
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as unknown as { id: string } | null;

    if (!profile || question.uploaded_by !== profile.id) {
      logger.warn({ event: "moderate.forbidden", message: "Non-owner attempted to moderate question", userId: user.id, metadata: { questionId, ownerId: question.uploaded_by } });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (question.status !== "pending_review") {
      logger.info({ event: "moderate.already_processed", message: "Question already processed", userId: user.id, metadata: { questionId, status: question.status } });
      return NextResponse.json(
        { error: "Question already processed" },
        { status: 409 },
      );
    }

    const { data: fileData } = await service.storage
      .from("pending")
      .download(question.file_url);

    if (!fileData) {
      logger.error({ event: "moderate.file_missing", message: "File not found in pending bucket", userId: user.id, metadata: { questionId, fileUrl: question.file_url } });
      return NextResponse.json(
        { error: "File not found in pending bucket" },
        { status: 404 },
      );
    }

    const fileValidation = validateFile(fileData.type, fileData.size);
    if (!fileValidation.valid) {
      logger.info({ event: "moderate.file_rejected", message: "File rejected by validation", userId: user.id, metadata: { questionId, reason: fileValidation.error } });

      const { data: allPages } = await service
        .from("past_question_pages")
        .select("file_url")
        .eq("question_id", questionId);

      if (allPages) {
        const allPaths = allPages.map((p: { file_url: string }) => p.file_url);
        await service.storage.from("pending").remove(allPaths);
      }

      await service
        .from("past_questions")
        .update({
          status: "rejected",
          ai_rejection_reason: fileValidation.error,
        } as never)
        .eq("id", questionId);
      return NextResponse.json(
        { pass: false, reason: fileValidation.error },
        { status: 200 },
      );
    }

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
    const fileBase64 = btoa(binary);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const geminiModel = process.env.GEMINI_MODEL;
    if (!geminiModel) {
      logger.error({ event: "moderate.missing_model", message: "GEMINI_MODEL env var not set" });
      return NextResponse.json({ error: "AI model not configured" }, { status: 500 });
    }
    const model = genAI.getGenerativeModel({ model: geminiModel });

    const prompt = `You are reviewing a university past question upload for a student platform.
Analyze the attached file carefully and return ONLY a valid JSON object — no preamble, no markdown, no explanation:
{ "pass": true or false, "reason": "..." }

Evaluate all five criteria. Fail if ANY single criterion is not met:

1. EXAM DOCUMENT: Is this file clearly a university examination, test paper, or past question paper? It should look like an official academic assessment with questions students are expected to answer.

2. READABILITY: Is the image or PDF sufficiently clear and legible for a student to read and study from? Blurry, extremely dark, or partially obscured documents should fail this check.

3. COURSE MATCH: Does the visible content of the document match the course it has been tagged as: "${courseCode} — ${courseName}"? Look for course codes, subject matter, programme references, or any visible header information.

4. SAFE CONTENT: Is the document free from harmful, offensive, sexually explicit, or completely unrelated content?

5. SESSION/SEMESTER MATCH: If the document visibly displays a semester label (e.g. "FIRST SEMESTER EXAMINATION" / "SECOND SEMESTER EXAMINATION") or an academic session (e.g. "2025/2026"), does it match what was provided: Semester "${question.semester === "first" ? "First" : "Second"}", Session "${question.year}/${Number(question.year) + 1}"? If the document does NOT clearly show semester or session information anywhere on the visible page, this criterion automatically passes — do not fail a document for missing information, only for a visible, legible MISMATCH.

Keep the reason field under 20 words. If pass is true, reason can be empty string.
Return JSON only.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType:
            question.file_type === "pdf" ? "application/pdf" : "image/jpeg",
          data: fileBase64,
        },
      },
      prompt,
    ]);

    const raw = result.response.text().trim();
    let verdict: { pass: boolean; reason: string };

    try {
      verdict = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      const { data: allPages } = await service
        .from("past_question_pages")
        .select("file_url")
        .eq("question_id", questionId);

      if (allPages) {
        const allPaths = allPages.map((p: { file_url: string }) => p.file_url);
        await service.storage.from("pending").remove(allPaths);
      }

      await service
        .from("past_questions")
        .update({
          status: "rejected",
          ai_rejection_reason: "Review could not be completed — please re-upload",
        } as never)
        .eq("id", questionId);

      logger.error({ event: "moderate.gemini_parse_failed", message: "Failed to parse Gemini response", userId: user.id, metadata: { questionId, raw } });
      return NextResponse.json(
        { pass: false, reason: "Review could not be completed — please re-upload" },
        { status: 200 },
      );
    }

    if (verdict.pass) {
      const { data: allPages } = await service
        .from("past_question_pages")
        .select("page_number, file_url, file_type")
        .eq("question_id", questionId)
        .order("page_number", { ascending: true });

      if (!allPages || allPages.length === 0) {
        logger.error({ event: "moderate.no_pages", message: "No pages found for approved question", userId: user.id, metadata: { questionId } });
        return NextResponse.json({ error: "No pages found" }, { status: 500 });
      }

      const pendingPaths: string[] = [];
      const approvedPaths: { oldPath: string; newPath: string }[] = [];

      for (const page of allPages as { page_number: number; file_url: string; file_type: string }[]) {
        const ext = page.file_type === "pdf" ? "pdf" : "jpg";
        const newPath = `approved/${questionId}/page-${page.page_number}.${ext}`;
        approvedPaths.push({ oldPath: page.file_url, newPath });
        pendingPaths.push(page.file_url);
      }

      let page1Approved = false;
      const page1NewPath = approvedPaths[0]?.newPath;

      for (const { oldPath, newPath } of approvedPaths) {
        try {
          const { data: fileData } = await service.storage
            .from("pending")
            .download(oldPath);

          if (fileData) {
            const { error: uploadError } = await service.storage
              .from("approved")
              .upload(newPath, fileData);

            if (uploadError) {
              logger.error({ event: "moderate.page_move_failed", message: "Failed to move page to approved bucket", userId: user.id, metadata: { questionId, oldPath, newPath, error: uploadError.message } });
            } else {
              if (newPath === page1NewPath) page1Approved = true;
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error({ event: "moderate.page_move_error", message: "Error moving page to approved", userId: user.id, metadata: { questionId, oldPath, newPath, error: msg } });
        }
      }

      await service.storage.from("pending").remove(pendingPaths);

      const pageUrlsToUpdate: Record<number, string> = {};
      for (const { oldPath, newPath } of approvedPaths) {
        const page = allPages.find((p: { file_url: string }) => p.file_url === oldPath) as { page_number: number } | undefined;
        if (page) {
          pageUrlsToUpdate[page.page_number] = newPath;
        }
      }

      const updatesNeeded = Object.keys(pageUrlsToUpdate).length > 0;
      if (updatesNeeded && page1Approved && page1NewPath) {
        const { error: updateError } = await service
          .from("past_questions")
          .update({
            status: "published",
            file_url: page1NewPath,
          } as never)
          .eq("id", questionId);

        if (updateError) {
          logger.error({ event: "moderate.update_failed", message: "Failed to update question status after approval", userId: user.id, metadata: { questionId, error: updateError.message } });
          return NextResponse.json(
            { error: "Failed to publish question" },
            { status: 500 },
          );
        }

        for (const [pageNum, newUrl] of Object.entries(pageUrlsToUpdate)) {
          await service
            .from("past_question_pages")
            .update({ file_url: newUrl } as never)
            .eq("question_id", questionId)
            .eq("page_number", parseInt(pageNum));
        }
      } else if (!page1Approved) {
        logger.error({ event: "moderate.page1_not_approved", message: "Critical page 1 was not moved to approved", userId: user.id, metadata: { questionId } });
        return NextResponse.json(
          { error: "Failed to move all files to approved storage" },
          { status: 500 },
        );
      }

      logger.info({ event: "moderate.passed", message: "Question passed moderation", userId: user.id, metadata: { questionId, pageCount: allPages.length }, durationMs: Date.now() - start });
      return NextResponse.json({ pass: true, reason: "" });
    } else {
      const { data: allPages } = await service
        .from("past_question_pages")
        .select("file_url")
        .eq("question_id", questionId);

      if (allPages) {
        const allPaths = allPages.map((p: { file_url: string }) => p.file_url);
        await service.storage.from("pending").remove(allPaths);
      }

      await service
        .from("past_questions")
        .update({
          status: "rejected",
          ai_rejection_reason: verdict.reason,
        } as never)
        .eq("id", questionId);

      logger.info({ event: "moderate.rejected", message: "Question rejected by AI", userId: user.id, metadata: { questionId, reason: verdict.reason }, durationMs: Date.now() - start });
      return NextResponse.json({ pass: false, reason: verdict.reason });
    }
  } catch (error) {
    const msg = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack}` : String(error);
    logger.error({ event: "moderate.error", message: "Unexpected moderation error", error: msg, durationMs: Date.now() - start });
    return NextResponse.json(
      { error: "Internal server error", detail: msg },
      { status: 500 },
    );
  }
}