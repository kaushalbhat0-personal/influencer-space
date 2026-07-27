-- AlterTable: Make GenerationSession.workspaceId optional
-- Before: workspaceId is required (String with @db.Uuid)
-- After: workspaceId is optional (nullable) until provisioning completes

ALTER TABLE "GenerationSession" ALTER COLUMN "workspaceId" DROP NOT NULL;
