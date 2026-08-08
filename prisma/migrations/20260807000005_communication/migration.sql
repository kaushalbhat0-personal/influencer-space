-- RCCF-TRACK-02 — Communication Runtime & Notification Center.
-- Additive, nullable — zero downtime.
--
-- NOTE (RCCF-LAUNCH-POLISH-05 DB sync): "id" columns are UUID — all these
-- models declare @db.Uuid in the schema.

CREATE TABLE "Notification" (
  "id" UUID NOT NULL,
  "audience" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "channel" TEXT NOT NULL DEFAULT 'in_app',
  "data" JSONB,
  "readAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_audience_recipientId_createdAt_idx" ON "Notification"("audience", "recipientId", "createdAt");
CREATE INDEX "Notification_audience_recipientId_readAt_idx" ON "Notification"("audience", "recipientId", "readAt");
CREATE INDEX "Notification_category_idx" ON "Notification"("category");

CREATE TABLE "NotificationPreference" (
  "id" UUID NOT NULL,
  "audience" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'in_app',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_audience_recipientId_category_key" ON "NotificationPreference"("audience", "recipientId", "category");

CREATE TABLE "CommunicationLog" (
  "id" UUID NOT NULL,
  "templateId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "provider" TEXT NOT NULL DEFAULT 'log',
  "retries" INTEGER NOT NULL DEFAULT 0,
  "maxRetries" INTEGER NOT NULL DEFAULT 3,
  "error" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunicationLog_status_createdAt_idx" ON "CommunicationLog"("status", "createdAt");
CREATE INDEX "CommunicationLog_templateId_idx" ON "CommunicationLog"("templateId");
CREATE INDEX "CommunicationLog_recipient_idx" ON "CommunicationLog"("recipient");
