-- Migration: Add Theme model for multi-theme support
-- Run this in Supabase Dashboard → SQL Editor

BEGIN;

-- 1. Create Theme table
CREATE TABLE IF NOT EXISTS "Theme" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"            TEXT NOT NULL UNIQUE,
  "primaryColor"    TEXT NOT NULL DEFAULT '#2D1B69',
  "secondaryColor"  TEXT NOT NULL DEFAULT '#00f5ff',
  "accentColor"     TEXT NOT NULL DEFAULT '#ff00e5',
  "backgroundColor" TEXT NOT NULL DEFAULT '#09090b',
  "textColor"       TEXT NOT NULL DEFAULT '#ffffff',
  "fontFamily"      TEXT NOT NULL DEFAULT 'Inter',
  "borderRadius"    TEXT NOT NULL DEFAULT '8px',
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add themeId FK to Tenant
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "themeId" UUID REFERENCES "Theme"("id") ON DELETE SET NULL;

-- 3. Seed the Gamer theme
INSERT INTO "Theme" ("id", "name", "primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor", "fontFamily", "borderRadius")
VALUES (
  gen_random_uuid(),
  'Gamer',
  '#2D1B69',
  '#00f5ff',
  '#ff00e5',
  '#09090b',
  '#ffffff',
  'Orbitron',
  '8px'
) ON CONFLICT ("name") DO NOTHING;

COMMIT;
