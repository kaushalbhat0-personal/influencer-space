-- RCCF-55 hardening: enforce the two-domain audit invariant at the DB level.
-- Every AuditLog row must populate EXACTLY ONE scope — tenantId XOR agencyId.
-- Prevents ambiguous rows (both or neither) from ever being written.
ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_one_scope_check"
    CHECK (("tenantId" IS NOT NULL AND "agencyId" IS NULL) OR ("tenantId" IS NULL AND "agencyId" IS NOT NULL));
