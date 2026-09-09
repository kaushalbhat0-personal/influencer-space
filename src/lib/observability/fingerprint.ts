import { createHash } from "crypto";

/**
 * RCCF-OBS-01 — deterministic fingerprint for SystemError deduplication.
 * Excludes volatile values: tenant IDs (UUID), timestamps, request IDs, latency, raw user input.
 * Basis: service + operation + code + normalized message + stack-top.
 */

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IP_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
const URL_RE = /https?:\/\/\S+/gi;
const HEX_TOKEN_RE = /\b[0-9a-f]{16,}\b/gi;
const NUMBER_RE = /\d+/g;

export function normalizeMessage(message: string): string {
  if (!message) return "";
  let out = message;
  out = out.replace(UUID_RE, "[UUID]");
  out = out.replace(EMAIL_RE, "[EMAIL]");
  out = out.replace(IP_RE, "[IP]");
  out = out.replace(URL_RE, "[URL]");
  out = out.replace(HEX_TOKEN_RE, "[TOKEN]");
  // Remove ISO timestamps
  out = out.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, "[TIMESTAMP]");
  out = out.replace(NUMBER_RE, "[N]");
  out = out.replace(/\s+/g, " ").trim().toLowerCase();
  // Truncate to avoid huge fingerprints
  if (out.length > 500) out = out.slice(0, 500);
  return out;
}

export function extractStackTop(stack?: string): string {
  if (!stack) return "";
  const lines = stack.split("\n").map((l) => l.trim()).filter(Boolean);
  // Skip first line if it's the error message (e.g., "Error: ...")
  const frames = lines.filter((l) => l.startsWith("at "));
  const top = frames[0] ?? lines[1] ?? lines[0] ?? "";
  let normalized = top.replace(UUID_RE, "[UUID]").replace(NUMBER_RE, "[N]").toLowerCase();
  // Keep only function/file part, drop absolute paths
  normalized = normalized.replace(/\(.*\)/, "(…)");
  if (normalized.length > 300) normalized = normalized.slice(0, 300);
  return normalized;
}

export function computeFingerprint(input: {
  service: string;
  operation?: string;
  code?: string;
  message: string;
  stack?: string;
}): string {
  const normalized = normalizeMessage(input.message);
  const stackTop = extractStackTop(input.stack);
  const basis = [input.service, input.operation ?? "", input.code ?? "", normalized, stackTop].join("|");
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}
