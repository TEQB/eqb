type LogLevel = "info" | "warn" | "error";

type LogEvent = {
  event: string;
  message: string;
  ip?: string;
  userId?: string;
  email?: string;
  path?: string;
  method?: string;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
};

const PREFIX = "[EQB]";

const persistedEventKeys = new Set<string>();

async function persistServerLog(level: LogLevel, e: LogEvent) {
  if (typeof window !== "undefined") return;
  const cacheKey = `${level}:${e.event}:${e.message}:${e.userId ?? ""}:${e.ip ?? ""}:${e.path ?? ""}`;
  if (persistedEventKeys.has(cacheKey)) return;
  persistedEventKeys.add(cacheKey);

  try {
    const { insertLog } = await import("./db-logger");
    await insertLog({
      event: e.event,
      message: e.message,
      level,
      ip: e.ip,
      userId: e.userId,
      userEmail: e.email,
      path: e.path,
      method: e.method,
      durationMs: e.durationMs,
      errorMessage: e.error,
      metadata: e.metadata,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[EQB] Failed to persist log:", msg);
  }
}

function write(level: LogLevel, e: LogEvent) {
  const entry = {
    t: new Date().toISOString(),
    lvl: level,
    ev: e.event,
    msg: e.message,
    ...(e.ip ? { ip: e.ip } : {}),
    ...(e.userId ? { uid: e.userId } : {}),
    ...(e.email ? { em: e.email } : {}),
    ...(e.path ? { p: e.path } : {}),
    ...(e.method ? { m: e.method } : {}),
    ...(e.durationMs !== undefined ? { d: e.durationMs } : {}),
    ...(e.error ? { err: e.error } : {}),
    ...(e.metadata ? { meta: e.metadata } : {}),
  };
  const line = `${PREFIX} ${JSON.stringify(entry)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
  void persistServerLog(level, e);
}

export const logger = {
  info: (e: LogEvent) => write("info", e),
  warn: (e: LogEvent) => write("warn", e),
  error: (e: LogEvent) => write("error", e),
};
