CREATE TABLE "ClientAssignment" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ClientAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClientAssignment_workspaceId_tenantId_userId_key" UNIQUE ("workspaceId", "tenantId", "userId")
);

ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;

ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;

ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE INDEX "ClientAssignment_workspaceId_idx" ON "ClientAssignment"("workspaceId");
CREATE INDEX "ClientAssignment_tenantId_idx" ON "ClientAssignment"("tenantId");
CREATE INDEX "ClientAssignment_userId_idx" ON "ClientAssignment"("userId");