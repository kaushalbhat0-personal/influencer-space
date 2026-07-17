import { prisma } from "@/lib/prisma";

type SqlExecutor = {
  $executeRawUnsafe: (query: string, ...params: unknown[]) => Promise<number>;
};

const SENSITIVE_PATTERNS = [
  /key/i,
  /secret/i,
  /token/i,
  /password/i,
  /authorization/i,
  /credential/i,
  /api[_-]?key/i,
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(key));
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    return sanitizeMetadata(value as Record<string, unknown>);
  }
  return value;
}

export function sanitizeMetadata(
  meta: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (isSensitiveKey(key)) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = sanitizeValue(value);
    }
  }
  return out;
}

export async function logAction(
  tenantId: string,
  action: string,
  metadata: Record<string, unknown> = {},
  tx?: SqlExecutor,
): Promise<void> {
  const client = tx || prisma;
  await client.$executeRawUnsafe(
    `INSERT INTO "AuditLog" ("id", "tenantId", "action", "metadata", "createdAt")
     VALUES (gen_random_uuid(), $1, $2, $3::jsonb, NOW())`,
    tenantId,
    action,
    JSON.stringify(sanitizeMetadata(metadata)),
  );
}

export async function purgeOldAuditLogs(
  olderThanDays: number = 90,
): Promise<{ deleted: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return { deleted: result.count };
}
