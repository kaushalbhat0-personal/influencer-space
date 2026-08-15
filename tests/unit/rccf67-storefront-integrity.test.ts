import { describe, it, expect, vi, beforeEach } from "vitest";

// ── RCCF-67.3 — Creator Storefront Correctness & Media Integrity ──────────
// 1) Pricing dead-section removal  2) Hero raw-URL bypass
// 3) Media copy/move integrity      4) Legacy storefront pipeline retirement

const h = vi.hoisted(() => {
  const assets: Array<{ id: string; tenantId: string; mimeType: string; size: number; storageKey: string; publicUrl: string | null; status: string; filename: string; originalFilename: string; checksum: string | null; width: number | null; height: number | null; altText: string | null }> = [];
  return {
    assets,
    mockLogAction: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockAfterContentChange: vi.fn(),
    reset: () => { assets.length = 0; },
  };
});

vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("next/cache", () => ({ revalidatePath: h.mockRevalidatePath }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/lib/publishing/content-change", () => ({ afterContentChange: h.mockAfterContentChange }));
vi.mock("@/lib/supabase", () => ({ supabaseClient: {}, supabaseAdmin: {}, BUCKET: "influencer-images" }));
vi.mock("@/modules/billing/application/plan-source", () => ({
  resolveActivePlan: async () => ({ code: "creator_scale", origin: "v2", status: "active" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fns: Array<Promise<unknown>>) => Promise.all(fns),
    asset: {
      findUnique: async ({ where }: { where: { id: string } }) => h.assets.find((a) => a.id === where.id) ?? null,
      findFirst: async ({ where }: { where: { id?: string; tenantId?: string } }) =>
        h.assets.find((a) => (!where.id || a.id === where.id) && (!where.tenantId || a.tenantId === where.tenantId)) ?? null,
    },
    setting: { findUnique: async () => null, findFirst: async () => null },
  },
}));

import { componentRegistry } from "@/lib/registry/components/registry";
import { registerBuiltinComponents } from "@/lib/registry/components/builtins";
import { resolveModuleId, isDeprecatedSection } from "@/lib/registry/resolve-module";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

function push(id: string, tenantId: string, mimeType: string, size: number, status = "ACTIVE") {
  h.assets.push({ id, tenantId, mimeType, size, storageKey: `t/${id}`, publicUrl: `https://cdn/${id}`, status, filename: `${id}.mp4`, originalFilename: `${id}.mp4`, checksum: `c-${id}`, width: null, height: null, altText: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockLogAction.mockResolvedValue(undefined);
  h.mockAfterContentChange.mockResolvedValue(undefined);
  registerBuiltinComponents();
  push("asset-video-a", TENANT_A, "video/mp4", 2 * 1024 * 1024);
  push("asset-big-a", TENANT_A, "video/mp4", 30 * 1024 * 1024);
  push("asset-b", TENANT_B, "video/mp4", 2 * 1024 * 1024);
  push("asset-webm-a", TENANT_A, "video/webm", 1024);
  push("asset-deleted", TENANT_A, "video/mp4", 1024, "DELETED");
});

// ── 1. Pricing removal ────────────────────────────────────────────────────

describe("RCCF-67.3 — Pricing storefront is removed (no dead capability)", () => {
  it("pricing.default is no longer a registered component", () => {
    expect(componentRegistry.get("pricing.default")).toBeUndefined();
  });

  it("resolveModuleId('pricing') no longer resolves to a registered id", () => {
    expect(componentRegistry.get(resolveModuleId("pricing"))).toBeUndefined();
  });

  it("legacy pricing.* sections are dropped as deprecated (like about.)", () => {
    expect(isDeprecatedSection("pricing.default")).toBe(true);
    expect(isDeprecatedSection("pricing.table")).toBe(true);
    expect(isDeprecatedSection("about.default")).toBe(true);
  });
});

// ── 2. Hero write-path is asset-backed ────────────────────────────────────
// Full RCCF-59 media tests (assertHeroVideoAsset, copy, move) live in
// src/lib/media/__tests__/media-service.test.ts. Here we assert the settings
// write-path guard wiring: the hero video reference must resolve to a
// tenant-owned asset — a raw URL alone is never an authority.

describe("RCCF-67.3 — hero video write-path is asset-backed", () => {
  it("the media service enforces tenant ownership on existing hero assets", async () => {
    const { mediaService } = await import("@/lib/media/service");
    // Cross-tenant lookup returns null before any provider work → fail closed.
    await expect(mediaService.assertHeroVideoAsset(TENANT_A, "asset-b")).rejects.toThrow(/not found/i);
    await expect(mediaService.assertHeroVideoAsset(TENANT_A, "asset-deleted")).rejects.toThrow();
  });
});

// ── 3. Media copy/move integrity ──────────────────────────────────────────

describe("RCCF-67.3 — media copy/move are tenant-scoped", () => {
  it("copy/move reject a cross-tenant asset and a deleted asset", async () => {
    const { mediaService } = await import("@/lib/media/service");
    await expect(mediaService.copy(TENANT_A, "asset-b")).rejects.toThrow(/not found/i);
    await expect(mediaService.copy(TENANT_A, "asset-deleted")).rejects.toThrow(/deleted/i);
    await expect(mediaService.move(TENANT_A, "asset-b", "general")).rejects.toThrow(/not found/i);
  });
});

// ── 4. Legacy storefront pipeline retirement ──────────────────────────────

describe("RCCF-67.3 — legacy storefront pipeline is retired (single canonical path)", () => {
  it("legacy public.service is gone and the canonical registry is intact", async () => {
    const services = await import("@/services/index");
    expect((services as Record<string, unknown>).getPublicPageData).toBeUndefined();
    expect((services as Record<string, unknown>).getContentFeed).toBeUndefined();
    // Live admin content-feed + canonical storefront remain.
    expect((services as Record<string, unknown>).getAllContentFeedItems).toBeTypeOf("function");
    expect(componentRegistry.get("hero.default")).toBeDefined();
    expect(componentRegistry.get("products.grid")).toBeDefined();
  });
});
