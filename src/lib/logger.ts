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
}

export const logger = {
  info: (e: LogEvent) => write("info", e),
  warn: (e: LogEvent) => write("warn", e),
  error: (e: LogEvent) => write("error", e),
};
