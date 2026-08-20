import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RCCF-72.15B — Creator Launch global active core-content limit.
 *
 * Creator Launch is a free but fully functional Creator plan: Products,
 * Services, Courses and Games are all available but share ONE Launch-wide
 * ceiling of 3 ACTIVE core content items. Testimonials and FAQ are separate
 * (max 3 each). Growth and Scale keep their existing per-type limits.
 *
 * These tests drive the shared primitive in
 * src/modules/billing/application/content-limit.enforcement.ts against an
 * in-memory model with a serializing $transaction queue that faithfully models
 * the Tenant FOR UPDATE row lock (concurrent creates run one at a time).
 */

const h = vi.hoisted(() => {
  // In-memory core-content tables. Rows mirror the real active predicates.
  const products: Array<{ tenantId: string; status: string; isActive: boolean; archivedAt: Date | null }> = [];
  const offerings: Array<{ tenantId: string; type: string; status: string }> = [];
  const games: Array<{ tenantId: string; isActive: boolean }> = [];
  const testimonials: Array<{ tenantId: string }> = [];
  const faqs: Array<{ tenantId: string }> = [];

  let seq = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = (cb: () => unknown) => { const run = queue.then(cb); queue = run.catch(() => {}); return run; };

  const activeProductCount = (tenantId: string) =>
    products.filter((p) => p.tenantId === tenantId && p.status === "PUBLISHED" && p.isActive === true && p.archivedAt === null).length;
  const activeOfferingCount = (tenantId: string, type: string) =>
    offerings.filter((o) => o.tenantId === tenantId && o.type === type && o.status === "published").length;
  const activeGameCount = (tenantId: string) =>
    games.filter((g) => g.tenantId === tenantId && g.isActive === true).length;

  const makeClient = (isTx: boolean) => ({
    $queryRaw: async () => {},
    product: {
      count: async ({ where }: { where: { tenantId: string; status?: string; isActive?: boolean; archivedAt?: null } }) => activeProductCount(where.tenantId),
      create: async ({ data }: { data: { tenantId: string; status?: string; isActive?: boolean; archivedAt?: Date | null } }) => {
        if (!isTx) return {};
        products.push({ tenantId: data.tenantId, status: data.status ?? "PUBLISHED", isActive: data.isActive ?? true, archivedAt: data.archivedAt ?? null });
        return { id: `p-${++seq}` };
      },
    },
    offering: {
      count: async ({ where }: { where: { tenantId: string; type?: string; status?: string } }) =>
        where.status ? activeOfferingCount(where.tenantId, where.type!) : offerings.filter((o) => o.tenantId === where.tenantId && o.type === where.type).length,
      create: async ({ data }: { data: { tenantId: string; type: string; status: string } }) => {
        if (!isTx) return {};
        offerings.push({ tenantId: data.tenantId, type: data.type, status: data.status });
        return { id: `o-${++seq}` };
      },
    },
    game: {
      count: async ({ where }: { where: { tenantId: string; isActive?: boolean } }) =>
        where.isActive === undefined ? games.filter((g) => g.tenantId === where.tenantId).length : activeGameCount(where.tenantId),
      create: async ({ data }: { data: { tenantId: string; isActive: boolean } }) => {
        if (!isTx) return {};
        games.push({ tenantId: data.tenantId, isActive: data.isActive });
        return { id: `g-${++seq}` };
      },
    },
  });

  const reset = () => { products.length = 0; offerings.length = 0; games.length = 0; testimonials.length = 0; faqs.length = 0; seq = 0; queue = Promise.resolve(); };

  return {
    products, offerings, games, testimonials, faqs,
    activeProductCount, activeOfferingCount, activeGameCount,
    reset, serialize,
    makeClient,
    addProduct: (t: string, o: Partial<{ status: string; isActive: boolean; archivedAt: Date | null }> = {}) =>
      products.push({ tenantId: t, status: o.status ?? "PUBLISHED", isActive: o.isActive ?? true, archivedAt: o.archivedAt ?? null }),
    addOffering: (t: string, type: string, status: string) => offerings.push({ tenantId: t, type, status }),
    addGame: (t: string, isActive: boolean) => games.push({ tenantId: t, isActive }),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ...h.makeClient(false),
    $transaction: (arg: unknown) => {
      if (typeof arg === "function") {
        return h.serialize(() => (arg as (tx: ReturnType<typeof h.makeClient>) => unknown)(h.makeClient(true)));
      }
      return (arg as Array<Promise<unknown>>).reduce((p, op) => p.then(() => op), Promise.resolve());
    },
  },
}));

const planMock = vi.hoisted(() => ({ resolveActivePlan: vi.fn() }));
vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: planMock.resolveActivePlan }));

import {
  enforceContentLimit,
  countActiveCoreContentUsage,
  withLaunchCoreContentCapacity,
  isLaunchPlan,
  LAUNCH_GLOBAL_LIMIT,
  LAUNCH_CORE_FEATURES,
} from "@/modules/billing/application/content-limit.enforcement";
import { FEATURE_IDS } from "@/lib/capabilities/constants";

const T = "tenant-1";
const launch = { code: "creator_launch", origin: "v2" as const, status: "ACTIVE" };
const grow = { code: "creator_grow", origin: "v2" as const, status: "ACTIVE" };
const scale = { code: "creator_scale", origin: "v2" as const, status: "ACTIVE" };

beforeEach(() => {
  h.reset();
  planMock.resolveActivePlan.mockReset();
});

describe("isLaunchPlan", () => {
  it("maps creator_launch (and legacy aliases) to Launch", () => {
    expect(isLaunchPlan("creator_launch")).toBe(true);
    expect(isLaunchPlan("creator_free")).toBe(true); // legacy alias → creator_launch
  });

  it("returns false for Growth, Scale and partner plans", () => {
    expect(isLaunchPlan("creator_grow")).toBe(false);
    expect(isLaunchPlan("creator_scale")).toBe(false);
    expect(isLaunchPlan("partner_free")).toBe(false);
    expect(isLaunchPlan(null)).toBe(false);
  });
});

describe("countActiveCoreContentUsage — active predicates", () => {
  it("counts only active core items", async () => {
    h.addProduct(T, { status: "PUBLISHED", isActive: true }); // active
    h.addProduct(T, { status: "PUBLISHED", isActive: false }); // inactive
    h.addProduct(T, { status: "PUBLISHED", isActive: true, archivedAt: new Date() }); // archived
    h.addOffering(T, "coaching", "published"); // active service
    h.addOffering(T, "coaching", "draft"); // draft service
    h.addOffering(T, "course", "published"); // active course
    h.addOffering(T, "course", "archived"); // archived course
    h.addGame(T, true); // active game
    h.addGame(T, false); // inactive game

    expect(await countActiveCoreContentUsage(T)).toBe(4); // 1 product + 1 service + 1 course + 1 game
  });

  it("excludes testimonials and FAQ from the core counter", async () => {
    h.addProduct(T);
    h.addProduct(T);
    h.addProduct(T);
    h.testimonials.push({ tenantId: T });
    h.testimonials.push({ tenantId: T });
    h.testimonials.push({ tenantId: T });
    h.faqs.push({ tenantId: T });
    h.faqs.push({ tenantId: T });
    h.faqs.push({ tenantId: T });
    expect(await countActiveCoreContentUsage(T)).toBe(3); // testimonials/faq not counted
  });
});

describe("enforceContentLimit — Launch global ceiling", () => {
  it("allows a 4th create when global active usage < 3", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    h.addProduct(T);
    h.addProduct(T);
    const r = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.PRODUCTS });
    expect(r.ok).toBe(true);
    expect(r.limit).toBe(LAUNCH_GLOBAL_LIMIT);
  });

  it("rejects a 4th core item across types (global counter)", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    h.addProduct(T); h.addProduct(T); h.addProduct(T); // 3 products
    const r = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.COURSES });
    expect(r.ok).toBe(false);
    expect(r.used).toBe(3);
    expect(r.limit).toBe(3);
  });

  it("counts Product + Course + Service as 3 total (allowed)", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    h.addProduct(T);
    h.addOffering(T, "coaching", "published");
    h.addOffering(T, "course", "published");
    const r = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.GAMES });
    expect(r.ok).toBe(false); // 3 active → no 4th
  });

  it("courses are available on Launch (capability, not locked)", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    const r = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.COURSES });
    expect(r.ok).toBe(true);
    expect(r.reason).toBeUndefined();
  });

  it("games are available on Launch", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    const r = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.GAMES });
    expect(r.ok).toBe(true);
  });
});

describe("enforceContentLimit — Growth / Scale unchanged", () => {
  it("Growth ignores the global ceiling (per-type unlimited)", async () => {
    planMock.resolveActivePlan.mockResolvedValue(grow);
    h.addProduct(T); h.addProduct(T); h.addProduct(T); h.addProduct(T); h.addProduct(T);
    const r = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.PRODUCTS });
    expect(r.ok).toBe(true);
  });

  it("Scale ignores the global ceiling", async () => {
    planMock.resolveActivePlan.mockResolvedValue(scale);
    h.addProduct(T); h.addProduct(T); h.addProduct(T); h.addProduct(T);
    const r = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.COURSES });
    expect(r.ok).toBe(true);
  });

  it("Growth still enforces its per-type games limit (10)", async () => {
    planMock.resolveActivePlan.mockResolvedValue(grow);
    for (let i = 0; i < 10; i++) h.addGame(T, true);
    const r = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.GAMES, used: 10 });
    expect(r.ok).toBe(false);
  });
});

describe("enforceContentLimit — Testimonials / FAQ separation", () => {
  it("Testimonials remain independently capped at 3 and don't consume core allowance", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    h.addProduct(T); h.addProduct(T); h.addProduct(T); // 3 core active
    // 3 core items + 3 testimonials should still allow a 3rd testimonial's check (per-type).
    const r = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.TESTIMONIALS, used: 2 });
    expect(r.ok).toBe(true); // testimonials independent
    const r4 = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.TESTIMONIALS, used: 3 });
    expect(r4.ok).toBe(false); // 4th testimonial rejected independently
  });

  it("FAQ remains independently capped at 3", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    const r = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.FAQ, used: 3 });
    expect(r.ok).toBe(false);
    const r2 = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.FAQ, used: 2 });
    expect(r2.ok).toBe(true);
  });

  it("3 testimonials do not consume core capacity", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    // 3 testimonials in settings (counted separately)
    const r = await enforceContentLimit({ tenantId: T, featureKey: FEATURE_IDS.PRODUCTS });
    expect(r.ok).toBe(true); // core still has room because testimonials don't count
  });
});

describe("withLaunchCoreContentCapacity — transactional create", () => {
  it("creates the item when capacity is available", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    h.addProduct(T); h.addProduct(T); // 2 active
    const out = await withLaunchCoreContentCapacity(T, FEATURE_IDS.GAMES, (tx) => tx.game.create({ data: { tenantId: T, isActive: true } }));
    expect(typeof out === "object" && out !== null && "id" in out).toBe(true);
    expect(h.activeGameCount(T)).toBe(1);
  });

  it("rejects the create when the global ceiling is reached", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    h.addProduct(T); h.addProduct(T); h.addProduct(T); // 3 active
    const out = await withLaunchCoreContentCapacity(T, FEATURE_IDS.GAMES, async (tx) => tx.game.create({ data: { tenantId: T, isActive: true } }));
    expect(typeof out === "object" && out !== null && "ok" in out).toBe(true);
    expect((out as { ok: boolean }).ok).toBe(false);
    expect((out as { used: number }).used).toBe(3);
    expect(h.activeGameCount(T)).toBe(0); // nothing created
  });

  it("mixed-type bypass impossible: 2 products + 1 course, then game rejected", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    h.addProduct(T); h.addProduct(T); h.addOffering(T, "course", "published"); // 3 active
    const out = await withLaunchCoreContentCapacity(T, FEATURE_IDS.GAMES, async (tx) => tx.game.create({ data: { tenantId: T, isActive: true } }));
    expect((out as { ok: boolean }).ok).toBe(false);
  });

  it("non-Launch plan falls through to existing per-type enforcement (Growth)", async () => {
    planMock.resolveActivePlan.mockResolvedValue(grow);
    h.addProduct(T); h.addProduct(T); h.addProduct(T); h.addProduct(T); h.addProduct(T);
    const out = await withLaunchCoreContentCapacity(T, FEATURE_IDS.PRODUCTS, (tx) => tx.product.create({ data: { tenantId: T } }));
    expect(typeof out === "object" && out !== null && "id" in out).toBe(true);
  });

  it("serializes concurrent creates so a Launch user cannot exceed 3", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    h.addProduct(T); h.addProduct(T); // 2 active
    const attempts = await Promise.all([
      withLaunchCoreContentCapacity(T, FEATURE_IDS.PRODUCTS, (tx) => tx.product.create({ data: { tenantId: T } })),
      withLaunchCoreContentCapacity(T, FEATURE_IDS.PRODUCTS, (tx) => tx.product.create({ data: { tenantId: T } })),
      withLaunchCoreContentCapacity(T, FEATURE_IDS.PRODUCTS, (tx) => tx.product.create({ data: { tenantId: T } })),
    ]);
    const created = attempts.filter((o) => typeof o === "object" && o !== null && "id" in o).length;
    expect(created).toBe(1); // only one of the three succeeds (2 + 1 = 3)
    expect(h.activeProductCount(T)).toBe(3); // never exceeds 3
  });
});

describe("tenant isolation", () => {
  it("global usage is scoped to the tenant", async () => {
    planMock.resolveActivePlan.mockResolvedValue(launch);
    h.addProduct("tenant-A"); h.addProduct("tenant-A"); h.addProduct("tenant-A");
    const r = await enforceContentLimit({ tenantId: "tenant-B", featureKey: FEATURE_IDS.PRODUCTS });
    expect(r.ok).toBe(true); // tenant-B has its own allowance
  });
});

describe("LAUNCH_CORE_FEATURES", () => {
  it("includes the four core types and excludes testimonials/faq", () => {
    expect(LAUNCH_CORE_FEATURES.has(FEATURE_IDS.PRODUCTS)).toBe(true);
    expect(LAUNCH_CORE_FEATURES.has(FEATURE_IDS.SERVICES)).toBe(true);
    expect(LAUNCH_CORE_FEATURES.has(FEATURE_IDS.COURSES)).toBe(true);
    expect(LAUNCH_CORE_FEATURES.has(FEATURE_IDS.GAMES)).toBe(true);
    expect(LAUNCH_CORE_FEATURES.has(FEATURE_IDS.TESTIMONIALS)).toBe(false);
    expect(LAUNCH_CORE_FEATURES.has(FEATURE_IDS.FAQ)).toBe(false);
  });
});
