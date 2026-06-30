import { createServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  event: string;
  message: string;
  level: LogLevel;
  ip?: string;
  userId?: string;
  userEmail?: string;
  path?: string;
  method?: string;
  durationMs?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  userAgent?: string;
}

function logsDb(supabase: ReturnType<typeof createServiceClient>) {
  return (supabase as unknown as AnySupabase).from("activity_logs");
}

export async function insertLog(entry: LogEntry): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await logsDb(supabase).insert({
      event: entry.event,
      message: entry.message,
      level: entry.level,
      ip: entry.ip ?? null,
      user_id: entry.userId ?? null,
      user_email: entry.userEmail ?? null,
      path: entry.path ?? null,
      method: entry.method ?? null,
      duration_ms: entry.durationMs ?? null,
      error_message: entry.errorMessage ?? null,
      metadata: entry.metadata ?? null,
      user_agent: entry.userAgent ?? null,
    } as Record<string, unknown>);
    if (error) {
      console.error("[EQB] Failed to insert log to DB:", error.message);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[EQB] DB logger exception:", msg);
  }
}

export async function queryLogs(params: {
  page?: number;
  limit?: number;
  level?: string;
  event?: string;
  userId?: string;
  ip?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}): Promise<{ logs: never[]; total: number }> {
  const {
    page = 1,
    limit = 50,
    level,
    event,
    userId,
    ip,
    dateFrom,
    dateTo,
    search,
  } = params;

  const supabase = createServiceClient();
  const from = (page - 1) * limit;

  let query = logsDb(supabase).select("*", { count: "exact" });

  if (level) query = query.eq("level", level);
  if (event) query = query.ilike("event", `%${event}%`);
  if (userId) query = query.eq("user_id", userId);
  if (ip) query = query.eq("ip", ip);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59.999Z");
  if (search) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as unknown as { or: (filter: string) => any }).or(`message.ilike.%${search}%,event.ilike.%${search}%`) as typeof query;
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) {
    console.error("[EQB] queryLogs error:", error.message);
    return { logs: [], total: 0 };
  }

  return { logs: (data ?? []) as never[], total: count ?? 0 };
}

export async function getLogStats(): Promise<{
  infoCount: number;
  warnCount: number;
  errorCount: number;
  totalLogs: number;
}> {
  const supabase = createServiceClient();

  const [{ count: infoCount }, { count: warnCount }, { count: errorCount }, { count: totalLogs }] =
    await Promise.all([
      logsDb(supabase).select("id", { count: "exact", head: true }).eq("level", "info"),
      logsDb(supabase).select("id", { count: "exact", head: true }).eq("level", "warn"),
      logsDb(supabase).select("id", { count: "exact", head: true }).eq("level", "error"),
      logsDb(supabase).select("id", { count: "exact", head: true }),
    ]);

  return {
    infoCount: infoCount ?? 0,
    warnCount: warnCount ?? 0,
    errorCount: errorCount ?? 0,
    totalLogs: totalLogs ?? 0,
  };
}