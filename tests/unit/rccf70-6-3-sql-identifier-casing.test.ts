import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// RCCF-70.6.3 / 70.6.3.1 — raw SQL row-lock queries must reference the
// Prisma-defined PostgreSQL table identifiers exactly.
//
// Prisma `model Tenant` / `Workspace` / `WebsiteAgency` map to quoted
// PascalCase tables ("Tenant", "Workspace", "WebsiteAgency") — the migrations
// create them with those exact names. Quoted PostgreSQL identifiers are
// case-sensitive, so a lowercase reference ("tenant") is a different,
// non-existent relation (42P01 undefined_table), which broke production Hero
// video uploads at the media quota commit.
//
// These are source-level guardrails: they pin both the CORRECT casing and the
// ABSENCE of the wrong casing, and assert the row lock is preserved (never
// replaced by a non-locking Prisma query).

describe("RCCF-70.6.3 — raw SQL PostgreSQL identifier casing", () => {
  it("media quota commit references \"Tenant\" (not \"tenant\") and keeps FOR UPDATE", () => {
    const src = readFileSync("src/lib/media/service.ts", "utf8");
    expect(src).toContain('SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE');
    expect(src).not.toContain('FROM "tenant"');
    // The authoritative lock and parameterized tenant bound value are preserved.
    expect(src).toContain("tx.$queryRaw`SELECT id FROM \"Tenant\" WHERE id = ${tenantId} FOR UPDATE`");
  });

  it("team-membership references \"Workspace\" (not \"workspace\") and keeps FOR UPDATE", () => {
    const src = readFileSync("src/modules/partner/application/team-membership.ts", "utf8");
    expect(src).toContain('SELECT id FROM "Workspace" WHERE id = ${invite.workspaceId} FOR UPDATE');
    expect(src).not.toContain('FROM "workspace"');
  });

  it("partner-relationship references \"WebsiteAgency\" (not \"website_agency\") and keeps FOR UPDATE", () => {
    const src = readFileSync("src/modules/partner/application/partner-relationship.ts", "utf8");
    expect(src).toContain('SELECT id FROM "WebsiteAgency" WHERE id = ${input.agencyId} FOR UPDATE');
    expect(src).not.toContain('FROM "website_agency"');
  });
});
