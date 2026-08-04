-- IMPLEMENTATION-41: Partner Platform schema additions.
-- AgencyTenant.workspaceId (creator workspace link) + Role enum SUPPORT/READ_ONLY.
-- Applied via plain pg client (runtime-SQL pattern; enum ADD VALUE is non-transactional).
ALTER TABLE "AgencyTenant" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "AgencyTenant_workspaceId_idx" ON "AgencyTenant" ("workspaceId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN','AGENCY_ADMIN','AGENCY_STAFF','ADMIN');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPPORT';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'READ_ONLY';
