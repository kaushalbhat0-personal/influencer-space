/**
 * RCCF-OBS-01 — redaction for SystemError before persistence.
 * Reuses audit.ts SENSITIVE_PATTERNS + extended pilot-sensitive patterns.
 * Never persist raw credential values or full sensitive request payloads.
 */

import { sanitizeMetadata as sanitizeAuditMetadata } from "@/lib/audit";

const REDACT = "[REDACTED]";

// Extended patterns beyond audit.ts
const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /re_[a-zA-Z0-9_\-]{10,}/g, // Resend re_xxx
  /rzp_(live|test)_[a-zA-Z0-9]+/g, // Razorpay
  /sk_(live|test)_[a-zA-Z0-9]+/g, // Stripe/OAuth generic
  /Bearer\s+[a-zA-Z0-9._\-]+/gi,
  /Basic\s+[a-zA-Z0-9+/=]+/gi,
];

const SENSITIVE_KEY_PATTERNS = [
  /key/i,
  /secret/i,
  /token/i,
  /password/i,
  /authorization/i,
  /credential/i,
  /api[_-]?key/i,
  /razorpay/i,
  /resend/i,
  /oauth/i,
  /card/i,
  /cvv/i,
  /upi/i,
  /payment/i,
  /email/i, // emails where appropriate — redact in stack/message but keep tenantId separate
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
}

function redactString(value: string): string {
  let out = value;
  for (const re of SENSITIVE_VALUE_PATTERNS) {
    out = out.replace(re, REDACT);
  }
  // Redact emails in message/stack (keep tenantIds array separate)
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, REDACT);
  // Redact long hex tokens (potential secrets)
  out = out.replace(/\b[0-9a-f]{24,}\b/gi, REDACT);
  // Redact quoted secrets: "apiKey":"xxx" or password=xxx
  out = out.replace(/(password|secret|token|api[_-]?key|authorization)[\s:="']+[^"'\s,}]+/gi, `$1=${REDACT}`);
  return out;
}

export function redactMessage(message: string): string {
  if (!message) return message;
  // First apply audit-style key-based redaction if message looks like JSON
  try {
    if (message.trim().startsWith("{") || message.trim().startsWith("[")) {
      const parsed = JSON.parse(message);
      if (typeof parsed === "object" && parsed !== null) {
        const sanitized = sanitizeAuditMetadata(parsed as Record<string, unknown>);
        return redactString(JSON.stringify(sanitized));
      }
    }
  } catch {}
  return redactString(message);
}

export function redactStack(stack?: string): string | undefined {
  if (!stack) return undefined;
  return redactString(stack);
}

export function redactMetadata(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  // Reuse audit sanitization then also scrub values
  const sanitized = sanitizeAuditMetadata(meta);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(sanitized)) {
    if (typeof v === "string") out[k] = redactString(v);
    else if (typeof v === "object" && v !== null) out[k] = sanitizeAuditMetadata(v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
}

// For tenantIds extraction — ensure we don't store raw emails as tenantIds
export function normalizeTenantIds(tenantId?: string | null): string[] {
  if (!tenantId) return [];
  // Only accept UUID-like tenantIds, not emails
  if (tenantId.includes("@")) return [];
  return [tenantId];
}
