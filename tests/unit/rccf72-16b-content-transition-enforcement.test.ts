import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RCCF-72.16B — Launch active-core content TRANSITION enforcement.
 *
 * RCCF-72.15B protects CREATE via `withLaunchCoreContentCapacity` (Tenant
 * FOR UPDATE + countActiveCoreContentUsage + global Launch limit of 3), but
 * DRAFT → PUBLISHED through updateProduct / updateCourse / updateService was
 * ungated — a Launch tenant could stockpile drafts and then promote them
 * beyond 3 ACTIVE core items.
 *
 * 72.16B generalizes the SAME canonical primitive to accept an active-state
 * transition resolver: an update only consumes capacity when it ACTIVATES a
 * previously inactive item (DRAFT/ARCHIVED → PUBLISHED/ACTIVE). Edits of
 * already-active items keep their slot; demotions release capacity.
 *
 * These tests execute the REAL server actions + REAL services + REAL capacity
 * primitive against an in-memory model with a serializing $transaction queue
 * that faithfully models the Tenant FOR UPDATE row lock (concurrent updates
 * run one at a time, exactly like the real DB).
 */

const h = vi.hoisted(() => {
  // In-memory core-content tables. Rows mirror the real active predicates.
  const products: Array<Record<string, unknown>> = [];
  const offerings: Array<Record<string, unknown>> = [];
  const games: Array<Record<string, unknown>> = [];

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
      count: async ({ where }: { where: { tenantId: string; status?: string; isActive?: boolean; archivedAt?: null } }) =>
        where.status === "PUBLISHED"
          ? activeProductCount(where.tenantId)
          : products.filter((p) => p.tenantId === where.tenantId).length,
      findFirst: async ({ where }: { where: { id: string; tenantId: string } }) =>
        products.find((p) => p.id === where.id && p.tenantId === where.tenantId) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (!isTx) return {};
        const row = { id: `p-${++seq}`, archivedAt: null, images: [], order: 0, createdAt: new Date(), updatedAt: new Date(), ...data };
        products.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = products.find((p) => p.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    offering: {
      count: async ({ where }: { where: { tenantId: string; type?: string; status?: string } }) =>
        where.status ? activeOfferingCount(where.tenantId, where.type!) : offerings.filter((o) => o.tenantId === where.tenantId && o.type === where.type).length,
      findFirst: async ({ where }: { where: { id: string; tenantId: string } }) =>
        offerings.find((o) => o.id === where.id && o.tenantId === where.tenantId) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (!isTx) return {};
        const row = { id: `o-${++seq}`, createdAt: new Date(), ...data };
        offerings.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = offerings.find((o) => o.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    game: {
      count: async ({ where }: { where: { tenantId: string; isActive?: boolean } }) => activeGameCount(where.tenantId),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (!isTx) return {};
        const row = { id: `g-${++seq}`, ...data };
        games.push(row);
        return row;
      },
      aggregate: async ({ where }: { where: { tenantId: string } }) => ({
        _max: { order: games.filter((g) => g.tenantId === where.tenantId).length },
      }),
    },
  });

  const reset = () => {
    products.length = 0; offerings.length = 0; games.length = 0; seq = 0; queue = Promise.resolve();
  };

  return {
    products, offerings, games,
    activeProductCount, activeOfferingCount, activeGameCount,
    reset, serialize, makeClient,
    addProduct: (t: string, o: Partial<{ id: string; status: string; isActive: boolean; archivedAt: Date | null }> = {}) => {
      const id = o.id ?? `p-${++seq}`;
      products.push({
        id, tenantId: t, name: `Product ${id}`, price: 100, status: o.status ?? "PUBLISHED",
        isActive: o.isActive ?? true, archivedAt: o.archivedAt ?? null, type: "digital", commerceMode: "ONLINE",
        images: [], isFeatured: false, order: 0, createdAt: new Date(), updatedAt: new Date(),
      });
      return id;
    },
    addOffering: (t: string, type: string, status: string, o: Partial<{ id: string; title: string }> = {}) => {
      const id = o.id ?? `o-${++seq}`;
      offerings.push({
        id, tenantId: t, type, title: o.title ?? (type === "coaching" ? `Service ${id}` : `Course ${id}`),
        price: 100, status, bookable: false, metadata: {}, createdAt: new Date(),
      });
      return id;
    },
    addGame: (t: string, isActive: boolean) => {
      const id = `g-${++seq}`;
      games.push({ id, tenantId: t, isActive, name: `Game ${id}`, order: 0 });
      return id;
    },
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

const sessionMock = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: sessionMock.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/publishing/content-change", () => ({ afterContentChange: vi.fn() }));

import { countActiveCoreContentUsage } from "@/modules/billing/application/content-limit.enforcement";
import { createProduct, updateProduct } from "@/features/products/actions";
import { createCourse, updateCourse } from "@/features/courses/actions";
import { createService, updateService } from "@/features/services/actions";

const T = "tenant-1";
const launch = { code: "creator_launch", origin: "v2" as const, status: "ACTIVE" };
const grow = { code: "creator_grow", origin: "v2" as const, status: "ACTIVE" };
const scale = { code: "creator_scale", origin: "v2" as const, status: "ACTIVE" };

const publishProduct = (id: string) =>
  updateProduct(id, { name: `Product ${id}`, price: 100, type: "digital", status: "PUBLISHED", isActive: true });
const demoteProduct = (id: string) =>
  updateProduct(id, { name: `Product ${id}`, price: 100, type: "digital", status: "DRAFT", isActive: false });
const publishCourse = (id: string) => updateCourse(id, { title: `Course ${id}`, price: 100, status: "PUBLISHED" });
const demoteCourse = (id: string) => updateCourse(id, { title: `Course ${id}`, price: 100, status: "DRAFT" });
const publishService = (id: string) => updateService(id, { title: `Service ${id}`, price: 100, status: "PUBLISHED" });
const demoteService = (id: string) => updateService(id, { title: `Service ${id}`, price: 100, status: "DRAFT" });

beforeEach(() => {
  h.reset();
  planMock.resolveActivePlan.mockReset();
  sessionMock.getServerSession.mockReset();
  sessionMock.getServerSession.mockResolvedValue({ user: { id: "u1", tenantId: T } });
});

// =============================================================================
// TEST GROUP 1 — PRODUCT TRANSITION
// =============================================================================

describe("Product transition — Launch global ceiling", () => {
  beforeEach(() => planMock.resolveActivePlan.mockResolvedValue(launch));

  it("rejects DRAFT → PUBLISHED at 3 active core items (count stays 3)", async () => {
    h.addProduct(T); h.addProduct(T); h.addProduct(T);
    const draft = h.addProduct(T, { status: "DRAFT", isActive: false });

    await expect(publishProduct(draft)).rejects.toThrow(/Core content limit reached/);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
    expect(h.products.find((p) => p.id === draft)!.status).toBe("DRAFT");
  });

  it("allows DRAFT → PUBLISHED at 2 active core items (count becomes 3)", async () => {
    h.addProduct(T); h.addProduct(T);
    const draft = h.addProduct(T, { status: "DRAFT", isActive: false });

    const updated = await publishProduct(draft);
    expect(updated.status).toBe("PUBLISHED");
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });

  it("allows editing an already-active product (no extra slot consumed)", async () => {
    h.addProduct(T); h.addProduct(T); h.addProduct(T);
    const activeId = h.products[0].id as string;

    const updated = await updateProduct(activeId, { name: "Renamed", price: 250 });
    expect(updated.name).toBe("Renamed");
    expect(updated.price).toBe(250);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });

  it("allows PUBLISHED → DRAFT (releases capacity)", async () => {
    h.addProduct(T); h.addProduct(T); h.addProduct(T);
    const activeId = h.products[0].id as string;

    const updated = await demoteProduct(activeId);
    expect(updated.status).toBe("DRAFT");
    expect(await countActiveCoreContentUsage(T)).toBe(2);
  });

  it("after freeing capacity, a new DRAFT → PUBLISHED is allowed", async () => {
    h.addProduct(T); h.addProduct(T); h.addProduct(T);
    const activeId = h.products[0].id as string;
    const draft = h.addProduct(T, { status: "DRAFT", isActive: false });

    await demoteProduct(activeId); // 3 → 2
    const updated = await publishProduct(draft); // 2 → 3
    expect(updated.status).toBe("PUBLISHED");
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });

  it("status PUBLISHED with isActive=false is NOT active → draft edit stays allowed (effective state wins)", async () => {
    h.addProduct(T); h.addProduct(T); h.addProduct(T);
    const draft = h.addProduct(T, { status: "DRAFT", isActive: false });

    // status PUBLISHED but isActive false ⇒ not ACTIVE → no new slot, allowed.
    const updated = await updateProduct(draft, { name: `Product ${draft}`, price: 100, type: "digital", status: "PUBLISHED", isActive: false });
    expect(updated.status).toBe("PUBLISHED");
    expect(updated.isActive).toBe(false);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });
});

// =============================================================================
// TEST GROUP 2 — COURSE TRANSITION
// =============================================================================

describe("Course transition — Launch global ceiling", () => {
  beforeEach(() => planMock.resolveActivePlan.mockResolvedValue(launch));

  it("rejects DRAFT → PUBLISHED at 3 active core items", async () => {
    h.addProduct(T); h.addProduct(T); h.addProduct(T);
    const draft = h.addOffering(T, "course", "draft");

    await expect(publishCourse(draft)).rejects.toThrow(/Core content limit reached/);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
    expect(h.offerings.find((o) => o.id === draft)!.status).toBe("draft");
  });

  it("allows DRAFT → PUBLISHED at 2 active core items", async () => {
    h.addProduct(T); h.addProduct(T);
    const draft = h.addOffering(T, "course", "draft");

    const updated = await publishCourse(draft);
    expect(updated.status).toBe("PUBLISHED");
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });

  it("allows editing an already-published course", async () => {
    h.addProduct(T); h.addProduct(T);
    const course = h.addOffering(T, "course", "published");

    const updated = await updateCourse(course, { title: "Renamed Course", price: 500, status: "PUBLISHED" });
    expect(updated.title).toBe("Renamed Course");
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });

  it("allows PUBLISHED → DRAFT (releases capacity)", async () => {
    h.addProduct(T); h.addProduct(T);
    const course = h.addOffering(T, "course", "published");

    const updated = await demoteCourse(course);
    expect(updated.status).toBe("DRAFT");
    expect(await countActiveCoreContentUsage(T)).toBe(2);
  });

  it("rejects ARCHIVED → PUBLISHED at 3 active core items", async () => {
    h.addProduct(T); h.addProduct(T); h.addProduct(T);
    const archived = h.addOffering(T, "course", "archived");

    await expect(publishCourse(archived)).rejects.toThrow(/Core content limit reached/);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });
});

// =============================================================================
// TEST GROUP 3 — SERVICE TRANSITION
// =============================================================================

describe("Service transition — Launch global ceiling", () => {
  beforeEach(() => planMock.resolveActivePlan.mockResolvedValue(launch));

  it("rejects DRAFT → PUBLISHED at 3 active core items", async () => {
    h.addProduct(T); h.addProduct(T); h.addProduct(T);
    const draft = h.addOffering(T, "coaching", "draft");

    await expect(publishService(draft)).rejects.toThrow(/Core content limit reached/);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
    expect(h.offerings.find((o) => o.id === draft)!.status).toBe("draft");
  });

  it("allows DRAFT → PUBLISHED at 2 active core items", async () => {
    h.addProduct(T); h.addProduct(T);
    const draft = h.addOffering(T, "coaching", "draft");

    const updated = await publishService(draft);
    expect(updated.status).toBe("PUBLISHED");
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });

  it("allows editing an already-published service", async () => {
    h.addProduct(T); h.addProduct(T);
    const svc = h.addOffering(T, "coaching", "published");

    const updated = await updateService(svc, { title: "Renamed Service", price: 900, status: "PUBLISHED" });
    expect(updated.title).toBe("Renamed Service");
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });

  it("allows PUBLISHED → DRAFT (releases capacity)", async () => {
    h.addProduct(T); h.addProduct(T);
    const svc = h.addOffering(T, "coaching", "published");

    const updated = await demoteService(svc);
    expect(updated.status).toBe("DRAFT");
    expect(await countActiveCoreContentUsage(T)).toBe(2);
  });

  it("rejects ARCHIVED → PUBLISHED at 3 active core items", async () => {
    h.addProduct(T); h.addProduct(T); h.addProduct(T);
    const archived = h.addOffering(T, "coaching", "archived");

    await expect(publishService(archived)).rejects.toThrow(/Core content limit reached/);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });
});

// =============================================================================
// TEST GROUP 4 — MIXED CORE TYPES (global cap, not per-type)
// =============================================================================

describe("Mixed core types — Launch global ceiling", () => {
  beforeEach(() => planMock.resolveActivePlan.mockResolvedValue(launch));

  it("1 product + 1 course + 1 service = 3, draft product → PUBLISHED rejected", async () => {
    h.addProduct(T);
    h.addOffering(T, "course", "published");
    h.addOffering(T, "coaching", "published");
    const draft = h.addProduct(T, { status: "DRAFT", isActive: false });

    await expect(publishProduct(draft)).rejects.toThrow(/Core content limit reached/);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });

  it("2 products + 1 game = 3, draft course → PUBLISHED rejected", async () => {
    h.addProduct(T); h.addProduct(T);
    h.addGame(T, true);
    const draft = h.addOffering(T, "course", "draft");

    await expect(publishCourse(draft)).rejects.toThrow(/Core content limit reached/);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });

  it("1 product + 1 course = 2, draft service → PUBLISHED succeeds", async () => {
    h.addProduct(T);
    h.addOffering(T, "course", "published");
    const draft = h.addOffering(T, "coaching", "draft");

    const updated = await publishService(draft);
    expect(updated.status).toBe("PUBLISHED");
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });
});

// =============================================================================
// TEST GROUP 5 — DRAFT STOCKPILING REGRESSION (the original exploit)
// =============================================================================

describe("Draft stockpiling regression — publish-by-update cannot exceed 3", () => {
  beforeEach(() => planMock.resolveActivePlan.mockResolvedValue(launch));

  it("create 5 drafts, publish #1-#3 pass, #4-#5 reject, invariant holds", async () => {
    const drafts: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const created = await createProduct({ name: `Draft ${i}`, price: 100, type: "digital", status: "DRAFT" });
      drafts.push(created.id);
    }
    expect(await countActiveCoreContentUsage(T)).toBe(0);

    await publishProduct(drafts[0]); // 0 → 1
    await publishProduct(drafts[1]); // 1 → 2
    await publishProduct(drafts[2]); // 2 → 3
    await expect(publishProduct(drafts[3])).rejects.toThrow(/Core content limit reached/);
    await expect(publishProduct(drafts[4])).rejects.toThrow(/Core content limit reached/);

    expect(await countActiveCoreContentUsage(T)).toBe(3);
    expect(h.products.filter((p) => p.status === "DRAFT").length).toBe(2);
  });

  it("course draft stockpile can also not be promoted beyond 3", async () => {
    const course1 = h.addOffering(T, "course", "draft");
    const course2 = h.addOffering(T, "course", "draft");
    const course3 = h.addOffering(T, "course", "draft");
    const course4 = h.addOffering(T, "course", "draft");

    await publishCourse(course1); // 1
    await publishCourse(course2); // 2
    await publishCourse(course3); // 3
    await expect(publishCourse(course4)).rejects.toThrow(/Core content limit reached/);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });

  it("service draft stockpile cannot be promoted beyond 3 either", async () => {
    const svc1 = h.addOffering(T, "coaching", "draft");
    const svc2 = h.addOffering(T, "coaching", "draft");
    const svc3 = h.addOffering(T, "coaching", "draft");
    const svc4 = h.addOffering(T, "coaching", "draft");

    await publishService(svc1); // 1
    await publishService(svc2); // 2
    await publishService(svc3); // 3
    await expect(publishService(svc4)).rejects.toThrow(/Core content limit reached/);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });
});

// =============================================================================
// TEST GROUP 6 — CONCURRENCY (tenant row lock serialization)
// =============================================================================

describe("Concurrent activations — tenant FOR UPDATE serialization", () => {
  beforeEach(() => planMock.resolveActivePlan.mockResolvedValue(launch));

  it("two simultaneous DRAFT → PUBLISHED with one slot left: exactly one wins", async () => {
    h.addProduct(T); h.addProduct(T);
    const draftA = h.addProduct(T, { status: "DRAFT", isActive: false });
    const draftB = h.addProduct(T, { status: "DRAFT", isActive: false });

    const results = await Promise.allSettled([publishProduct(draftA), publishProduct(draftB)]);

    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected").length;
    expect(fulfilled).toBe(1);
    expect(rejected).toBe(1);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });

  it("three simultaneous activations from 0 active: only 3 can fit", async () => {
    const d1 = h.addProduct(T, { status: "DRAFT", isActive: false });
    const d2 = h.addProduct(T, { status: "DRAFT", isActive: false });
    const d3 = h.addProduct(T, { status: "DRAFT", isActive: false });
    const d4 = h.addProduct(T, { status: "DRAFT", isActive: false });

    const results = await Promise.allSettled([publishProduct(d1), publishProduct(d2), publishProduct(d3), publishProduct(d4)]);

    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    expect(fulfilled).toBe(3);
    expect(await countActiveCoreContentUsage(T)).toBe(3);
  });
});

// =============================================================================
// TEST GROUP 7 — NON-LAUNCH REGRESSION (Growth / Scale unchanged)
// =============================================================================

describe("Growth / Scale — update transitions keep existing (ungated) behavior", () => {
  it("Growth DRAFT → PUBLISHED stays allowed", async () => {
    planMock.resolveActivePlan.mockResolvedValue(grow);
    for (let i = 0; i < 5; i++) h.addProduct(T);
    const draft = h.addProduct(T, { status: "DRAFT", isActive: false });

    const updated = await publishProduct(draft);
    expect(updated.status).toBe("PUBLISHED");
    expect(await countActiveCoreContentUsage(T)).toBe(6);
  });

  it("Scale course DRAFT → PUBLISHED stays allowed", async () => {
    planMock.resolveActivePlan.mockResolvedValue(scale);
    for (let i = 0; i < 5; i++) h.addOffering(T, "course", "published");
    const draft = h.addOffering(T, "course", "draft");

    const updated = await publishCourse(draft);
    expect(updated.status).toBe("PUBLISHED");
  });

  it("Scale service DRAFT → PUBLISHED stays allowed", async () => {
    planMock.resolveActivePlan.mockResolvedValue(scale);
    for (let i = 0; i < 5; i++) h.addOffering(T, "coaching", "published");
    const draft = h.addOffering(T, "coaching", "draft");

    const updated = await publishService(draft);
    expect(updated.status).toBe("PUBLISHED");
  });
});