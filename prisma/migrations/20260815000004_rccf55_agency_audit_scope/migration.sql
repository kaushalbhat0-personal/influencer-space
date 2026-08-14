-- RCCF-55: Partner team audit trail visibility. The existing AuditLog.tenantId
-- is FK-bound to Tenant, so agency-scoped team events (partner:team-*) could
-- never persist. This makes tenantId nullable and adds a nullable agencyId
-- column so agency events live in the SAME audit table (ONE audit source of
-- truth). Existing tenant events are untouched; the FK + index mirror the
-- tenant-side pattern. All existing rows keep their tenantId.
ALTER TABLE "AuditLog" ALTER COLUMN "tenantId" DROP NOT NULL;

ALTER TABLE "AuditLog" ADD COLUMN "agencyId" UUID;

ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES "WebsiteAgency"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "AuditLog_agencyId_createdAt_idx" ON "AuditLog"("agencyId", "createdAt");
