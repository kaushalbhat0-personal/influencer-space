-- RCCF-LIVE-SMOKE-01 — isolated LIVE smoke test pricing override (default OFF).
-- Singleton row id='live-smoke-test' controls ₹1 checkout for eligible plans when enabled by SUPER_ADMIN.
CREATE TABLE IF NOT EXISTS "LiveSmokeTestConfig" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledBy" TEXT,
    "enabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveSmokeTestConfig_pkey" PRIMARY KEY ("id")
);
-- Seed singleton OFF (idempotent)
INSERT INTO "LiveSmokeTestConfig" ("id", "enabled") VALUES ('live-smoke-test', false)
ON CONFLICT ("id") DO NOTHING;
