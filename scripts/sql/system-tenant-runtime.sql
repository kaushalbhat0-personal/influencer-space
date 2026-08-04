-- IMPLEMENTATION-40: System tenant for platform-scoped audit rows.
-- logAction("system", ...) maps to this stable UUID (AuditLog.tenantId is a
-- non-null FK). Idempotent.
INSERT INTO "Tenant" ("id", "name", "subdomain", "createdAt", "updatedAt")
SELECT '00000000-0000-0000-0000-000000000000', 'System', 'system', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Tenant" WHERE "id" = '00000000-0000-0000-0000-000000000000');
