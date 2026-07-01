import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { createHash } from "crypto";
import { createServiceClient } from "./supabase/service";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatSession(startYear: number): string {
  return `${startYear}/${startYear + 1}`;
}

export function daysRemaining(lastUploadAt: string | null, obligationDays: number): number {
  if (!lastUploadAt) return 0;
  const deadline = new Date(lastUploadAt);
  deadline.setDate(deadline.getDate() + obligationDays);
  const diff = deadline.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

interface RateLimitEntry {
  count: number;
  reset: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function cleanupRateLimitStore(now = Date.now()) {
  let activeCount = 0;
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.reset) {
      rateLimitStore.delete(key);
    } else {
      activeCount++;
    }
  });

  if (activeCount > 100) {
    console.log(
      `[EQB] ${JSON.stringify({ t: new Date(now).toISOString(), lvl: "warn", ev: "ratelimit.high_utilization", msg: "Rate limit store has high number of active entries", count: activeCount })}`,
    );
  }
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  cleanupRateLimitStore(now);
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.reset) {
    rateLimitStore.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count++;
  return true;
}

export function getRateLimitCount(key: string): number {
  cleanupRateLimitStore();
  const entry = rateLimitStore.get(key);
  if (!entry || Date.now() > entry.reset) return 0;
  return entry.count;
}

export function getActiveRateLimitKeys(): number {
  cleanupRateLimitStore();
  return rateLimitStore.size;
}

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateFile(
  mimeType: string,
  size: number,
): { valid: true } | { valid: false; error: string } {
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: "File exceeds 10MB limit" };
  }
  if (!ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
    return { valid: false, error: "Only PDF, JPG, and PNG files are allowed" };
  }
  return { valid: true };
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const SEMESTERS = ["first", "second"] as const;
export function isValidSemester(value: string): value is "first" | "second" {
  return SEMESTERS.includes(value as typeof SEMESTERS[number]);
}

export async function checkDbRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<boolean> {
  try {
    const service = createServiceClient();
    const expiresAt = new Date(Date.now() + windowMs).toISOString();

    const { data: existing } = await service
      .from("rate_limits" as never)
      .select("count, expires_at")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      const row = existing as unknown as { count: number; expires_at: string };
      if (new Date(row.expires_at).getTime() > Date.now()) {
        if (row.count >= maxAttempts) return false;
        await service
          .from("rate_limits" as never)
          .update({ count: row.count + 1 } as never)
          .eq("key", key);
        return true;
      }
    }

    await service.from("rate_limits" as never).upsert({
        key,
        count: 1,
        expires_at: expiresAt,
      } as never);
    return true;
  } catch {
    return checkRateLimit(key, maxAttempts, windowMs);
  }
}
