import { platformTelemetry } from "@/lib/telemetry/telemetry";
import { safeCorrelationId } from "@/lib/platform/correlation/context";
import type { CorrelationContext } from "@/lib/platform/correlation/types";

export enum LogLevel {
  TRACE = "TRACE",
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
}

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  [LogLevel.TRACE]: 0,
  [LogLevel.DEBUG]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.WARN]: 3,
  [LogLevel.ERROR]: 4,
  [LogLevel.FATAL]: 5,
};

const EFFECTIVE_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? LogLevel.INFO
  : process.env.LOG_LEVEL
    ? (process.env.LOG_LEVEL as LogLevel)
    : LogLevel.DEBUG;

export interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  operation?: string;
  correlationId?: string;
  workspaceId?: string;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  environment: string;
  error?: {
    name?: string;
    message: string;
    stack?: string;
    recovery?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface LogMeta {
  operation?: string;
  correlation?: CorrelationContext | string;
  duration?: number;
  error?: Error & { recovery?: string };
  metadata?: Record<string, unknown>;
}

export interface ChildLogger {
  trace(message: string, service: string, meta?: LogMeta): void;
  debug(message: string, service: string, meta?: LogMeta): void;
  info(message: string, service: string, meta?: LogMeta): void;
  warn(message: string, service: string, meta?: LogMeta): void;
  error(message: string, service: string, meta?: LogMeta): void;
  fatal(message: string, service: string, meta?: LogMeta): void;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_RANK[level] >= LOG_LEVEL_RANK[EFFECTIVE_LEVEL];
}

function basePayload(service: string, correlation?: CorrelationContext | string): Omit<LogPayload, "level" | "message"> {
  const correlationId = typeof correlation === "string"
    ? correlation
    : safeCorrelationId(correlation);
  return {
    timestamp: new Date().toISOString(),
    service,
    correlationId: correlationId === "uncorrelated" ? undefined : correlationId,
    workspaceId: typeof correlation !== "string" ? correlation?.workspaceId : undefined,
    tenantId: typeof correlation !== "string" ? correlation?.creatorId : undefined,
    requestId: typeof correlation !== "string" ? correlation?.requestId : undefined,
    environment: process.env.NODE_ENV || "development",
  };
}

function write(level: LogLevel, message: string, service: string, meta?: LogMeta): void {
  if (!shouldLog(level)) return;

  const payload: LogPayload = {
    ...basePayload(service, meta?.correlation),
    level,
    message,
    operation: meta?.operation,
    duration: meta?.duration,
    metadata: meta?.metadata,
  };

  if (meta?.error) {
    payload.error = {
      name: meta.error.name,
      message: meta.error.message,
      stack: meta.error.stack,
      recovery: (meta.error as Error & { recovery?: string }).recovery,
    };
  }

  const line = JSON.stringify(payload);

  switch (level) {
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      console.error(line);
      break;
    case LogLevel.WARN:
      console.warn(line);
      break;
    default:
      console.log(line);
  }

  platformTelemetry.counter("log_messages", 1, { level, service });
}

export const logger = {
  trace(message: string, service: string, meta?: LogMeta): void {
    write(LogLevel.TRACE, message, service, meta);
  },

  debug(message: string, service: string, meta?: LogMeta): void {
    write(LogLevel.DEBUG, message, service, meta);
  },

  info(message: string, service: string, meta?: LogMeta): void {
    write(LogLevel.INFO, message, service, meta);
  },

  warn(message: string, service: string, meta?: LogMeta): void {
    write(LogLevel.WARN, message, service, meta);
  },

  error(message: string, service: string, meta?: LogMeta): void {
    write(LogLevel.ERROR, message, service, meta);
  },

  fatal(message: string, service: string, meta?: LogMeta): void {
    write(LogLevel.FATAL, message, service, meta);
  },

  child(service: string, defaultMeta?: {
    correlation?: CorrelationContext | string;
    workspaceId?: string;
    tenantId?: string;
  }): ChildLogger {
    return {
      trace: (msg: string, _svc: string, m?: LogMeta) => write(LogLevel.TRACE, msg, service, { ...defaultMeta, ...m }),
      debug: (msg: string, _svc: string, m?: LogMeta) => write(LogLevel.DEBUG, msg, service, { ...defaultMeta, ...m }),
      info: (msg: string, _svc: string, m?: LogMeta) => write(LogLevel.INFO, msg, service, { ...defaultMeta, ...m }),
      warn: (msg: string, _svc: string, m?: LogMeta) => write(LogLevel.WARN, msg, service, { ...defaultMeta, ...m }),
      error: (msg: string, _svc: string, m?: LogMeta) => write(LogLevel.ERROR, msg, service, { ...defaultMeta, ...m }),
      fatal: (msg: string, _svc: string, m?: LogMeta) => write(LogLevel.FATAL, msg, service, { ...defaultMeta, ...m }),
    };
  },

  flush(): void {
    // Reserved: flush buffered logs to external sink in future
  },
};

export type Logger = typeof logger;
