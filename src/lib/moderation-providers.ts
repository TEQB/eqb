import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

export type ModerationVerdict = { pass: boolean; reason: string };

export type ProviderAttemptResult =
  | { outcome: "verdict"; provider: string; verdict: ModerationVerdict }
  | { outcome: "failed"; provider: string; error: string };

type ProviderFn = (args: {
  imageBytes: Buffer;
  mimeType: string;
  prompt: string;
}) => Promise<ModerationVerdict>;

const PROVIDER_ORDER_ENV = process.env.MODERATION_PROVIDER_ORDER || "groq,nvidia,gemini";

const PROVIDER_FN_MAP: Record<string, ProviderFn> = {};

let usableProviders: string[] | null = null;

function computeUsableProviders(): string[] {
  const configured: string[] = [];
  const orderList = PROVIDER_ORDER_ENV.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  for (const name of orderList) {
    if (name === "gemini" && process.env.GEMINI_API_KEY) {
      configured.push("gemini");
    } else if (name === "groq" && process.env.GROQ_API_KEY) {
      configured.push("groq");
    } else if (name === "nvidia" && process.env.NVIDIA_API_KEY) {
      configured.push("nvidia");
    }
  }

  return configured;
}

function getUsableProviders(): string[] {
  if (!usableProviders) {
    usableProviders = computeUsableProviders();
    if (usableProviders.length === 0) {
      logger.warn({
        event: "moderate.providers.none_configured",
        message:
          "No moderation providers are configured. Set at least one of GROQ_API_KEY, NVIDIA_API_KEY, or GEMINI_API_KEY",
      });
    }
  }
  return usableProviders;
}

function base64FromBytes(bytes: Buffer): string {
  return bytes.toString("base64");
}

function parseVerdict(raw: unknown, provider: string): ModerationVerdict {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "pass" in raw &&
    "reason" in raw &&
    typeof (raw as Record<string, unknown>).pass === "boolean" &&
    typeof (raw as Record<string, unknown>).reason === "string"
  ) {
    return { pass: (raw as { pass: boolean }).pass, reason: (raw as { reason: string }).reason };
  }
  throw new Error(`Malformed verdict shape from ${provider}`);
}

// Gemini: supports PDFs natively, no conversion needed
export async function callGeminiModeration({
  imageBytes,
  mimeType,
  prompt,
}: {
  imageBytes: Buffer;
  mimeType: string;
  prompt: string;
}): Promise<ModerationVerdict> {
  const geminiModel = process.env.GEMINI_MODEL;
  if (!geminiModel) {
    throw new Error("GEMINI_MODEL env var not set");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: geminiModel });

  const binary = Array.from(imageBytes).map((b) => String.fromCharCode(b)).join("");
  const fileBase64 = btoa(binary);

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: mimeType as "application/pdf" | "image/jpeg" | "image/png",
        data: fileBase64,
      },
    },
    prompt,
  ]);

  const raw = result.response.text().trim().replace(/```json|```/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${raw.slice(0, 100)}`);
  }
  return parseVerdict(parsed, "gemini");
}

// Groq: OpenAI-compatible chat completions, requires image bytes (no PDF support)
export async function callGroqModeration({
  imageBytes,
  mimeType,
  prompt,
}: {
  imageBytes: Buffer;
  mimeType: string;
  prompt: string;
}): Promise<ModerationVerdict> {
  const apiKey = process.env.GROQ_API_KEY!;
  const model = process.env.GROQ_MODERATION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
  const fileBase64 = base64FromBytes(imageBytes);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${fileBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 256,
      temperature: 0.1,
    }),
  });

  const ratelimitRemaining = response.headers.get("x-ratelimit-remaining-requests");
  const tokenRemaining = response.headers.get("x-ratelimit-remaining-tokens");
  const retryAfter = response.headers.get("retry-after");
  logger.info({
    event: "moderate.groq.response",
    message: "Groq moderation response",
    metadata: {
      status: response.status,
      x_ratelimit_remaining_requests: ratelimitRemaining,
      x_ratelimit_remaining_tokens: tokenRemaining,
      retry_after: retryAfter,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (data.error) {
    throw new Error(`Groq API error: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned empty message content");
  }

  const stripped = content.replace(/```json|```/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error(`Groq returned invalid JSON: ${stripped.slice(0, 100)}`);
  }
  return parseVerdict(parsed, "groq");
}

// NVIDIA: OpenAI-compatible chat completions, requires image bytes (no PDF support)
export async function callNvidiaModeration({
  imageBytes,
  mimeType,
  prompt,
}: {
  imageBytes: Buffer;
  mimeType: string;
  prompt: string;
}): Promise<ModerationVerdict> {
  const apiKey = process.env.NVIDIA_API_KEY!;
  const model = process.env.NVIDIA_MODERATION_MODEL;
  if (!model) {
    throw new Error(
      "NVIDIA provider selected but NVIDIA_MODERATION_MODEL is not set. Set it to a valid NVIDIA NIM model ID (e.g. meta/llama-4-scout-17b-16e-instruct).",
    );
  }
  const fileBase64 = base64FromBytes(imageBytes);

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${fileBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 256,
      temperature: 0.1,
    }),
  });

  const ratelimitRemaining = response.headers.get("x-ratelimit-remaining-requests");
  const tokenRemaining = response.headers.get("x-ratelimit-remaining-tokens");
  const retryAfter = response.headers.get("retry-after");
  logger.info({
    event: "moderate.nvidia.response",
    message: "NVIDIA moderation response",
    metadata: {
      status: response.status,
      x_ratelimit_remaining_requests: ratelimitRemaining,
      x_ratelimit_remaining_tokens: tokenRemaining,
      retry_after: retryAfter,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`NVIDIA request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (data.error) {
    throw new Error(`NVIDIA API error: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("NVIDIA returned empty message content");
  }

  const stripped = content.replace(/```json|```/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error(`NVIDIA returned invalid JSON: ${stripped.slice(0, 100)}`);
  }
  return parseVerdict(parsed, "nvidia");
}

// Lazy-initialized PDF-to-JPEG conversion (only used for non-gemini providers on PDF input)
let pdfConversionCache: { jpegBytes: Buffer } | null = null;

async function convertPdfToJpeg(pdfBytes: Buffer): Promise<Buffer> {
  if (pdfConversionCache) return pdfConversionCache.jpegBytes;

  let sharpLib: typeof import("sharp") | null = null;
  try {
    sharpLib = await import("sharp");
  } catch {
    // sharp not available
  }

  if (!sharpLib) {
    throw new Error(
      "PDF files require conversion to image format, but the sharp library is not available. Use Gemini for PDF moderation or convert the PDF to an image before uploading.",
    );
  }

  try {
    // sharp can read PDF bytes and convert the first page to JPEG
    const jpegBuffer = await sharpLib.default(pdfBytes, { page: 0 })
      .jpeg({ quality: 85 })
      .toBuffer();
    pdfConversionCache = { jpegBytes: jpegBuffer };
    return jpegBuffer;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`PDF to JPEG conversion failed: ${msg}`);
  }
}

export async function moderateWithFailover({
  imageBytes,
  originalMimeType,
  prompt,
}: {
  imageBytes: Buffer;
  originalMimeType: string;
  prompt: string;
}): Promise<{
  verdict: ModerationVerdict;
  providerUsed: string;
  attempts: ProviderAttemptResult[];
}> {
  const providers = getUsableProviders();
  if (providers.length === 0) {
    throw new Error(
      "No moderation providers configured — set at least one of GROQ_API_KEY, NVIDIA_API_KEY, or GEMINI_API_KEY",
    );
  }

  pdfConversionCache = null; // reset per request
  const attempts: ProviderAttemptResult[] = [];

  for (const provider of providers) {
    let bytes = imageBytes;
    let mimeType = originalMimeType;

    // Gemini supports PDFs natively; others need JPEG conversion
    if (provider !== "gemini" && originalMimeType === "application/pdf") {
      try {
        bytes = await convertPdfToJpeg(imageBytes);
        mimeType = "image/jpeg";
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        attempts.push({ outcome: "failed", provider, error: msg });
        logger.warn({
          event: "moderate.provider_failed",
          message: `Moderation provider failed: ${provider}`,
          metadata: { provider, error: msg },
        });
        continue; // try next provider
      }
    }

    const fn = PROVIDER_FN_MAP[provider];
    if (!fn) {
      attempts.push({ outcome: "failed", provider, error: `Unknown provider: ${provider}` });
      continue;
    }

    try {
      const verdict = await fn({ imageBytes: bytes, mimeType, prompt });
      attempts.push({ outcome: "verdict", provider, verdict });
      return { verdict, providerUsed: provider, attempts };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      attempts.push({ outcome: "failed", provider, error: msg });
      logger.warn({
        event: "moderate.provider_failed",
        message: `Moderation provider failed: ${provider}`,
        metadata: { provider, error: msg },
      });
      // Continue to next provider — fail fast, no artificial delay
    }
  }

  // All providers failed
  const failureSummary = attempts
    .filter((a) => a.outcome === "failed")
    .map((a) => `${a.provider}: ${a.error}`)
    .join("; ");
  throw new Error(`All moderation providers failed: ${failureSummary}`);
}

// Register functions in the map
PROVIDER_FN_MAP.gemini = callGeminiModeration;
PROVIDER_FN_MAP.groq = callGroqModeration;
PROVIDER_FN_MAP.nvidia = callNvidiaModeration;