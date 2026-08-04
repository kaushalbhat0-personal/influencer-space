-- IMPLEMENTATION-40: durable platform operations state.
-- Applied via `prisma db execute` (runtime SQL — same pattern as the revenue tables).

CREATE TABLE IF NOT EXISTS "AlertRecord" (
  "id" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "title" TEXT NOT NULL,
  "message" TEXT,
  "source" TEXT NOT NULL,
  "service" TEXT,
  "tenantId" TEXT,
  "workspaceId" TEXT,
  "relatedJobId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "acknowledgedBy" TEXT,
  CONSTRAINT "AlertRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AlertRecord_level_idx" ON "AlertRecord" ("level");
CREATE INDEX IF NOT EXISTS "AlertRecord_status_idx" ON "AlertRecord" ("status");
CREATE INDEX IF NOT EXISTS "AlertRecord_source_idx" ON "AlertRecord" ("source");
CREATE INDEX IF NOT EXISTS "AlertRecord_createdAt_idx" ON "AlertRecord" ("createdAt");

CREATE TABLE IF NOT EXISTS "JobRecord" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "error" TEXT,
  "triggeredBy" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobRecord_status_idx" ON "JobRecord" ("status");
CREATE INDEX IF NOT EXISTS "JobRecord_type_idx" ON "JobRecord" ("type");
CREATE INDEX IF NOT EXISTS "JobRecord_createdAt_idx" ON "JobRecord" ("createdAt");
