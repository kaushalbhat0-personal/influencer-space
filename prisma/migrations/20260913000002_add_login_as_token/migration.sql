-- RCCF-PLATFORM-P1-01 — one-time login-as tokens (replay + expiry safe)
CREATE TABLE IF NOT EXISTS "LoginAsToken" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tenantId" TEXT,
    "agencyId" TEXT,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginAsToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LoginAsToken_jti_key" ON "LoginAsToken"("jti");
CREATE INDEX IF NOT EXISTS "LoginAsToken_expiresAt_idx" ON "LoginAsToken"("expiresAt");
