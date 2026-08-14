import { prisma } from "@/lib/prisma";

type SqlExecutor = {
  $executeRawUnsafe: (query: string, ...params: unknown[]) => Promise<number>;
};

/**
 * ARCHITECTURAL INVARIANT (RCCF-55):
 * AuditLog has two domains — tenant-scoped (`tenantId`) and agency-scoped
 * (`agencyId`). EXACTLY ONE scope must be populated for every new AuditLog row.
 * The DB enforces this with a CHECK constraint (see
 * 20260815000005_auditlog_one_scope); these writers enforce it at the boundary
 * too so a malformed call fails loudly instead of writing an ambiguous row.
 */
function assertScope(scope: string, column: "tenantId" | "agencyId", action: string): void {
  if (typeof scope !== "string" || scope.trim().length === 0) {
    throw new Error(`Invalid audit scope for ${action}: ${column} must be a non-empty id`);
  }
}

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
  // "system" is a pseudo-tenant (platform-scoped action); AuditLog.tenantId is a
  // non-null UUID, so map it to a stable sentinel instead of crashing on the
  // literal string (IMPLEMENTATION-40 fixes the latent runtime error).
  const tenantUuid = tenantId === "system" ? "00000000-0000-0000-0000-000000000000" : tenantId;
  assertScope(tenantUuid, "tenantId", action);
  await client.$executeRawUnsafe(
    `INSERT INTO "AuditLog" ("id", "tenantId", "action", "metadata", "createdAt")
     VALUES (gen_random_uuid(), $1, $2, $3::jsonb, NOW())`,
    tenantUuid,
    action,
    JSON.stringify(sanitizeMetadata(metadata)),
  );
}

/**
 * RCCF-55 — agency-scoped audit event (Partner team lifecycle). AuditLog.tenantId
 * is FK-bound to Tenant, so agency events persist with tenantId NULL + agencyId
 * set, in the SAME audit table (one audit source of truth). Scope is always
 * server-derived; callers pass the authenticated agency id.
 */
export async function logAgencyAction(
  agencyId: string,
  action: string,
  metadata: Record<string, unknown> = {},
  tx?: SqlExecutor,
): Promise<void> {
  const client = tx || prisma;
  assertScope(agencyId, "agencyId", action);
  await client.$executeRawUnsafe(
    `INSERT INTO "AuditLog" ("id", "tenantId", "agencyId", "action", "metadata", "createdAt")
     VALUES (gen_random_uuid(), NULL, $1, $2, $3::jsonb, NOW())`,
    agencyId,
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
