CREATE TABLE "ContentFeedItem" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"     UUID         NOT NULL,
  "platform"     TEXT         NOT NULL,
  "mediaType"    TEXT         NOT NULL,
  "url"          TEXT         NOT NULL,
  "thumbnailUrl" TEXT,
  "caption"      TEXT,
  "permalink"    TEXT,
  "pinned"       BOOLEAN      NOT NULL DEFAULT false,
  "hidden"       BOOLEAN      NOT NULL DEFAULT false,
  "externalId"   TEXT,
  "order"        INTEGER      NOT NULL DEFAULT 0,
  "syncedAt"     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContentFeedItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContentFeedItem_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "ContentFeedItem_tenantId_externalId_key"
    UNIQUE ("tenantId", "externalId")
);

CREATE INDEX "ContentFeedItem_tenantId_pinned_hidden_order_idx"
  ON "ContentFeedItem" ("tenantId", "pinned", "hidden", "order");
