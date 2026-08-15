import { describe, it, expect, vi, beforeEach } from "vitest";

// ── RCCF-69.4 (P1-A) — Gallery reorder cross-tenant write IDOR closure ────
// GalleryService.reorder must be tenant-authoritative: a client-supplied image
// id is never sufficient ownership proof. Every update is scoped to the
// authenticated tenant via updateMany({ id, tenantId }).

const h = vi.hoisted(() => {
  const images: Array<{ id: string; tenantId: string; order: number }> = [];
  const authCalls: string[] = [];
  return {
    images, authCalls,
    session: null as { user: { id: string; tenantId: string; role: string } } | null,
    resolvedTenantId: null as string | null,
    mockLogAction: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockEnforceContentLimit: vi.fn(),
    reset: () => {
      images.length = 0; authCalls.length = 0; h.session = null; h.resolvedTenantId = null;
    },
  };
});

vi.mock("next/cache", () => ({ revalidatePath: h.mockRevalidatePath }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));

// workspace-permissions.requireAuth resolves tenant from the session /
// workspace; we simulate the session-authoritative authority here.
vi.mock("@/modules/workspace/application/workspace-permissions", () => ({
  requireAuth: async (tenantId: string) => {
    h.authCalls.push(tenantId);
    const effective = h.resolvedTenantId ?? h.session?.user?.tenantId ?? null;
    if (!effective) throw new Error("Unauthorized");
    if (h.session?.user?.role !== "SUPER_ADMIN" && effective !== tenantId) throw new Error("Forbidden");
  },
  requireFound: <T>(item: T | null): asserts item is T => {
    if (!item) throw new Error("Gallery item not found");
  },
}));

vi.mock("@/lib/gallery/queries", () => ({
  findGalleryItems: async () => ({ items: [], total: 0, page: 1, totalPages: 0 }),
  findGalleryItemById: async (id: string, tenantId: string) =>
    h.images.find((i) => i.id === id && i.tenantId === tenantId) ?? null,
}));

vi.mock("@/lib/gallery/validation", () => ({
  galleryCreateSchema: { safeParse: () => ({ success: false }) },
  getFirstValidationError: () => "invalid",
}));

vi.mock("@/modules/billing/application/content-limit.enforcement", () => ({
  enforceContentLimit: h.mockEnforceContentLimit,
}));

// prisma mock — updateMany must scope by { id, tenantId } (the fixed path);
// update() by bare id is NOT available so a regression to the old code fails.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    galleryImage: {
      aggregate: async () => ({ _max: { order: 0 } }),
      create: async ({ data }: { data: { tenantId: string; order: number } }) => {
        const r = { id: `img-${h.images.length + 1}`, ...data };
        h.images.push(r);
        return r;
      },
      findMany: async () => [],
      updateMany: async ({ where, data }: { where: { id: string; tenantId: string }; data: { order: number } }) => {
        const matched = h.images.filter((i) => i.id === where.id && i.tenantId === where.tenantId);
        for (const m of matched) m.order = data.order;
        return { count: matched.length };
      },
      update: vi.fn().mockImplementation(() => { throw new Error("update() must not be used for reorder (IDOR)"); }),
      delete: async ({ where }: { where: { id: string } }) => { const i = h.images.find((x) => x.id === where.id)!; h.images = h.images.filter((x) => x.id !== where.id); return i; },
      deleteMany: async () => ({ count: 0 }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({ galleryImage: (await import("@/lib/prisma")).prisma.galleryImage }),
  },
}));

import { GalleryService } from "@/lib/gallery/service";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

function image(id: string, tenantId: string, order = 0) {
  return { id, tenantId, order };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockLogAction.mockResolvedValue(undefined);
  h.mockRevalidatePath.mockImplementation(() => {});
  h.mockEnforceContentLimit.mockResolvedValue({ ok: true });
  h.images.push(image("img-A1", TENANT_A, 1));
  h.images.push(image("img-A2", TENANT_A, 2));
  h.images.push(image("img-B1", TENANT_B, 1));
});

describe("RCCF-69.4 — gallery reorder tenant authority (P1-A)", () => {
  it("same-tenant reorder succeeds (Creator A reorders A's image)", async () => {
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    const res = await GalleryService.reorder(TENANT_A, [{ id: "img-A1", order: 9 }]);
    expect(res.success).toBe(true);
    expect(h.images.find((i) => i.id === "img-A1")!.order).toBe(9);
  });

  it("cross-tenant reorder is a no-op (Creator A cannot change B's image)", async () => {
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    const before = h.images.find((i) => i.id === "img-B1")!.order;
    const res = await GalleryService.reorder(TENANT_A, [{ id: "img-B1", order: 99 }]);
    expect(res.success).toBe(true);
    expect(res.affected).toBe(0);
    expect(h.images.find((i) => i.id === "img-B1")!.order).toBe(before);
  });

  it("mixed same/cross-tenant ids: A's changes, B's untouched", async () => {
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    const bBefore = h.images.find((i) => i.id === "img-B1")!.order;
    const res = await GalleryService.reorder(TENANT_A, [
      { id: "img-A1", order: 11 },
      { id: "img-B1", order: 77 },
      { id: "img-A2", order: 12 },
    ]);
    expect(res.success).toBe(true);
    expect(res.affected).toBe(2);
    expect(h.images.find((i) => i.id === "img-A1")!.order).toBe(11);
    expect(h.images.find((i) => i.id === "img-A2")!.order).toBe(12);
    expect(h.images.find((i) => i.id === "img-B1")!.order).toBe(bBefore);
  });

  it("client tenant spoof (tenantId=B arg, session=A) cannot mutate B", async () => {
    // requireAuth throws Forbidden when the arg tenant ≠ session tenant.
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    const bBefore = h.images.find((i) => i.id === "img-B1")!.order;
    await expect(GalleryService.reorder(TENANT_B, [{ id: "img-B1", order: 5 }])).rejects.toThrow("Forbidden");
    expect(h.images.find((i) => i.id === "img-B1")!.order).toBe(bBefore);
  });

  it("unauthenticated reorder is rejected", async () => {
    h.session = null;
    h.resolvedTenantId = null;
    const res = await GalleryService.reorder(TENANT_A, [{ id: "img-A1", order: 5 }]).catch((e: Error) => ({ success: false, error: e.message }));
    expect(res.success).toBe(false);
    expect(h.images.find((i) => i.id === "img-A1")!.order).toBe(1);
  });

  it("uses updateMany scoped to { id, tenantId } — bare update() is never called", async () => {
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    await GalleryService.reorder(TENANT_A, [{ id: "img-A1", order: 3 }]);
    // The prisma mock's update() throws; if the fix regressed to update(),
    // this test fails.
    expect(h.images.find((i) => i.id === "img-A1")!.order).toBe(3);
  });
});
