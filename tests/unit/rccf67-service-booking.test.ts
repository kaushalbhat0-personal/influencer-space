import { describe, it, expect, vi, beforeEach } from "vitest";

// ── RCCF-67.5 — Service Booking Completion ─────────────────────────────────
// Service/Offering → bookable → slots (Booking.offeringId) → storefront →
// public booking (service-relationship + bookable validated server-side).
// Courses remain display-only. No payment path.

const h = vi.hoisted(() => {
  const offerings: Array<{ id: string; tenantId: string; type: string; title: string; price: number; status: string; bookable: boolean; metadata: Record<string, unknown> }> = [];
  const bookings: Array<{ id: string; tenantId: string; offeringId: string | null; title: string; price: number; duration: number; slotDate: Date; slotStart: string; slotEnd: string; timezone: string; status: string; customerEmail: string | null; approvalRequired: boolean; customerName: string | null; customerPhone: string | null; notes: string | null }> = [];
  const updateCalls: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }> = [];
  return {
    offerings, bookings, updateCalls,
    mockGetTenantContext: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockEnforceContentLimit: vi.fn(),
    mockWithCapacity: vi.fn(),
    mockHeaderGet: vi.fn(),
    mockGetServerSession: vi.fn(),
    reset: () => { offerings.length = 0; bookings.length = 0; updateCalls.length = 0; },
  };
});

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("@/lib/tenant", () => ({ getTenantContext: h.mockGetTenantContext }));
vi.mock("@/lib/security/rate-limiter", () => ({ checkRateLimit: h.mockCheckRateLimit }));
vi.mock("@/modules/billing/application/content-limit.enforcement", () => ({
  enforceContentLimit: h.mockEnforceContentLimit,
  // RCCF-72.15B: createService routes through the transactional wrapper.
  withLaunchCoreContentCapacity: h.mockWithCapacity,
}));
vi.mock("next/headers", () => ({ headers: () => ({ get: h.mockHeaderGet }) }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/publishing/content-change", () => ({ afterContentChange: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findFirst: async () => null, findUnique: async () => null },
    offering: {
      findMany: async ({ where, select: _select }: { where: Record<string, unknown>; select: Record<string, unknown> }) =>
        h.offerings
          .filter((o) => o.tenantId === where.tenantId && (!where.type || o.type === where.type))
          .map((o) => ({ ...o, metadata: o.metadata as unknown })),
      findFirst: async ({ where, select: _select }: { where: Record<string, unknown>; select: Record<string, unknown> }) =>
        h.offerings.find((o) => (!where.id || o.id === where.id) && (!where.tenantId || o.tenantId === where.tenantId) && (!where.type || o.type === where.type)) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const o = { id: `svc-${h.offerings.length + 1}`, tenantId: String(data.tenantId), type: String(data.type), title: String(data.title), price: Number(data.price), status: String(data.status ?? "published"), bookable: Boolean(data.bookable ?? false), metadata: (data.metadata as Record<string, unknown>) ?? {} };
        h.offerings.push(o);
        return o;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const o = h.offerings.find((x) => x.id === where.id)!;
        Object.assign(o, data, { metadata: { ...o.metadata, ...((data.metadata as Record<string, unknown>) ?? {}) } });
        return o;
      },
      deleteMany: async ({ where }: { where: { id: string; tenantId: string } }) => {
        const before = h.offerings.length;
        h.offerings = h.offerings.filter((o) => !(o.id === where.id && o.tenantId === where.tenantId));
        return { count: before - h.offerings.length };
      },
    },
    booking: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const b = { id: `bk-${h.bookings.length + 1}`, tenantId: String(data.tenantId), offeringId: (data.offeringId as string | null) ?? null, title: String(data.title), price: Number(data.price ?? 0), duration: Number(data.duration ?? 60), slotDate: data.slotDate as Date, slotStart: String(data.slotStart ?? "09:00"), slotEnd: String(data.slotEnd ?? "10:00"), timezone: "Asia/Kolkata", status: String(data.status ?? "pending"), customerEmail: (data.customerEmail as string | null) ?? null, approvalRequired: Boolean(data.approvalRequired ?? true), customerName: (data.customerName as string | null) ?? null, customerPhone: (data.customerPhone as string | null) ?? null, notes: (data.notes as string | null) ?? null };
        h.bookings.push(b);
        return b;
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        h.updateCalls.push({ where, data });
        const gte = (where.slotDate as { gte?: Date } | undefined)?.gte ?? new Date(0);
        const match = h.bookings.find((b) =>
          b.id === where.id && b.tenantId === where.tenantId && b.customerEmail === null && b.status !== "cancelled" && b.slotDate >= gte,
        );
        if (!match) return { count: 0 };
        Object.assign(match, data);
        return { count: 1 };
      },
      findUnique: async ({ where, select }: { where: { id: string }; select: Record<string, unknown> }) => {
        const b = h.bookings.find((x) => x.id === where.id);
        if (!b) return null;
        if (select.offeringId) return { offeringId: b.offeringId };
        return b;
      },
      findMany: async ({ where, include }: { where: Record<string, unknown>; include: { offering?: unknown } }) =>
        h.bookings
          .filter((b) => (!where.tenantId || b.tenantId === where.tenantId))
          .map((b) => (include?.offering ? { ...b, offering: b.offeringId ? h.offerings.find((o) => o.id === b.offeringId) ?? null : null } : b)),
    },
  },
}));

import { createService, updateService, createServiceBookingSlot } from "@/features/services/actions";
import { submitPublicBooking } from "@/actions/storefront-bookings.actions";
import { LayoutEngine } from "@/lib/storefront/layout-engine/LayoutEngine";
import { componentRegistry } from "@/lib/registry/components/registry";
import { registerBuiltinComponents } from "@/lib/registry/components/builtins";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";
const SERVICE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SERVICE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SLOT_1 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SLOT_2 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function openSlot(id: string, serviceId: string | null, overrides: Partial<Record<string, unknown>> = {}) {
  const s = {
    id, tenantId: TENANT_A, offeringId: serviceId, title: "Strategy Call", price: 2000, duration: 60,
    slotDate: new Date("2099-02-10T00:00:00Z"), slotStart: "10:00", slotEnd: "11:00", timezone: "Asia/Kolkata",
    status: "pending", customerEmail: null, approvalRequired: true, customerName: null, customerPhone: null, notes: null,
  };
  Object.assign(s, overrides);
  return s as typeof s;
}

function bookingForm(bookingId: string) {
  const fd = new FormData();
  fd.set("bookingId", bookingId);
  fd.set("customerName", "Alice");
  fd.set("customerEmail", "alice@example.com");
  fd.set("customerPhone", "+91 90000 00000");
  return fd;
}

const engine = new LayoutEngine();

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockGetServerSession.mockResolvedValue({ user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } });
  h.mockGetTenantContext.mockResolvedValue({ id: TENANT_A });
  h.mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60_000, retryAfterMs: 0 });
  h.mockEnforceContentLimit.mockResolvedValue({ ok: true, featureKey: "max_bookings", used: 0, limit: 20 });
  // Default: capacity available → run the create work (falls back to the mocked
  // prisma client when tx is undefined, matching the real service behavior).
  h.mockWithCapacity.mockImplementation(async (_tenantId: string, _featureKey: string, work: (tx: unknown) => Promise<unknown>) => work(undefined));
  h.mockHeaderGet.mockReturnValue("8.8.8.8");
  registerBuiltinComponents();
  h.offerings.push({ id: SERVICE_A, tenantId: TENANT_A, type: "coaching", title: "Strategy Call", price: 2000, status: "published", bookable: true, metadata: { duration: "60 min" } });
  h.offerings.push({ id: SERVICE_B, tenantId: TENANT_B, type: "coaching", title: "Other", price: 500, status: "published", bookable: true, metadata: {} });
  h.bookings.push(openSlot(SLOT_1, SERVICE_A));
  h.bookings.push(openSlot(SLOT_2, null));
});

// ── Service admin (bookable toggle) ────────────────────────────────────────

describe("RCCF-67.5 — Service admin bookable toggle", () => {
  it("creator creates a bookable service", async () => {
    const res = await createService({ title: "Consult", price: 1000, bookable: true });
    if (!res.success) throw new Error("expected success");
    expect(res.data.bookable).toBe(true);
    expect(res.data.title).toBe("Consult");
  });

  it("creator can disable bookable", async () => {
    await updateService(SERVICE_A, { title: "Strategy Call", price: 2000, bookable: false });
    const s = h.offerings.find((o) => o.id === SERVICE_A)!;
    expect(s.bookable).toBe(false);
  });

  it("cross-tenant service update is rejected (not found)", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "uB", tenantId: TENANT_B, role: "ADMIN" } });
    await expect(updateService(SERVICE_A, { title: "Hijack", price: 0 })).rejects.toThrow("Service not found");
  });

  it("max_services is enforced on create (structured rejection, no record)", async () => {
    h.mockWithCapacity.mockResolvedValue({ ok: false, featureKey: "max_services", used: 3, limit: 3, reason: "Services limit reached (3/3)." });
    const res = await createService({ title: "Overflow", price: 1 });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/limit/i);
    expect(h.offerings.some((o) => o.title === "Overflow")).toBe(false);
  });

  it("bookable defaults to false for legacy services", async () => {
    const res = await createService({ title: "Legacy", price: 50 });
    if (!res.success) throw new Error("expected success");
    expect(res.data.bookable).toBe(false);
  });
});

// ── Service → Booking slot creation ────────────────────────────────────────

describe("RCCF-67.5 — createServiceBookingSlot", () => {
  it("creates a slot referencing the service, price derived server-side", async () => {
    const res = await createServiceBookingSlot({ serviceId: SERVICE_A, slotDate: "2099-03-01", slotStart: "09:00", slotEnd: "10:00", approvalRequired: true });
    expect(res.success).toBe(true);
    const slot = h.bookings.find((b) => b.offeringId === SERVICE_A && b.slotDate.toISOString().startsWith("2099-03-01"));
    expect(slot).toBeDefined();
    expect(slot!.price).toBe(2000); // from the Offering, not the client
    expect(slot!.duration).toBe(60);
    expect(slot!.offeringId).toBe(SERVICE_A);
    expect(slot!.status).toBe("pending");
  });

  it("rejects slot creation for a non-bookable service", async () => {
    await updateService(SERVICE_A, { title: "Strategy Call", price: 2000, bookable: false });
    const res = await createServiceBookingSlot({ serviceId: SERVICE_A, slotDate: "2099-03-01", slotStart: "09:00", slotEnd: "10:00" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not bookable/i);
  });

  it("rejects slot creation against a foreign service", async () => {
    const res = await createServiceBookingSlot({ serviceId: SERVICE_B, slotDate: "2099-03-01", slotStart: "09:00", slotEnd: "10:00" });
    expect(res.success).toBe(false);
    expect(res.error).toBe("Service not found");
  });
});

// ── Public booking with service validation ─────────────────────────────────

describe("RCCF-67.5 — public booking validates service relationship + bookable", () => {
  it("books a slot tied to a bookable service", async () => {
    const res = await submitPublicBooking({ success: false }, bookingForm(SLOT_1));
    expect(res.success).toBe(true);
    expect(res.status).toBe("pending approval");
    // Claim scoped to resolved tenant; slot must have a bookable offering.
    expect(h.updateCalls[0].where).toMatchObject({ id: SLOT_1, tenantId: TENANT_A });
  });

  it("rejects a slot whose service is no longer bookable", async () => {
    await updateService(SERVICE_A, { title: "Strategy Call", price: 2000, bookable: false });
    const res = await submitPublicBooking({ success: false }, bookingForm(SLOT_1));
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no longer available/i);
  });

  it("rejects a slot whose service belongs to another tenant", async () => {
    // B's service is not resolvable under A's tenant → offering lookup fails.
    const res = await submitPublicBooking({ success: false }, bookingForm(SLOT_2));
    // SLOT_2 has offeringId null (standalone) — it is bookable as before.
    expect(res.success).toBe(true);
  });

  it("rejects a slot whose service is not published", async () => {
    const o = h.offerings.find((x) => x.id === SERVICE_A)!;
    o.status = "draft";
    const res = await submitPublicBooking({ success: false }, bookingForm(SLOT_1));
    expect(res.success).toBe(false);
  });

  it("client can never supply price/tenant/approval (schema only accepts bookingId + customer fields)", async () => {
    const res = await submitPublicBooking({ success: false }, bookingForm(SLOT_1));
    expect(res.success).toBe(true);
    const data = h.updateCalls[0].data as Record<string, unknown>;
    expect(data.price).toBeUndefined();
    expect(data.tenantId).toBeUndefined();
    expect(data.approvalRequired).toBeUndefined();
    expect(data.status).toBeUndefined();
  });

  it("approval-required booking stays pending; normal becomes confirmed", async () => {
    const p1 = await submitPublicBooking({ success: false }, bookingForm(SLOT_1));
    expect(p1.status).toBe("pending approval");
    const b2 = openSlot("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", SERVICE_A, { approvalRequired: false });
    h.bookings.push(b2);
    const p2 = await submitPublicBooking({ success: false }, bookingForm(b2.id));
    expect(p2.status).toBe("confirmed");
  });
});

// ── Aggregate / snapshot / LayoutEngine / registry ─────────────────────────

describe("RCCF-67.5 — service booking reaches the storefront pipeline", () => {
  it("bookings.default and services.default are registered; no parallel commerce path", () => {
    expect(componentRegistry.get("bookings.default")).toBeDefined();
    expect(componentRegistry.get("services.default")).toBeDefined();
    expect(componentRegistry.get("serviceOrder.default")).toBeUndefined();
    expect(componentRegistry.get("serviceCheckout.default")).toBeUndefined();
  });

  it("LayoutEngine passes bookable + bookableSlots into the services renderer", () => {
    const snap = {
      _schema: "creatorstore.snapshot", _version: 1,
      metadata: { version: 1, publishedAt: "2026-01-01T00:00:00Z", previousVersion: null, correlationId: "x", generatedBy: "dashboard" },
      content: {
        identity: { name: "C", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
        hero: { title: "Hi", subtitle: "", description: "" },
        products: [], gallery: [], links: [], seo: { title: "", description: "" },
        services: [{ id: SERVICE_A, title: "Strategy Call", description: null, price: 2000, duration: "60 min", imageUrl: null, category: null, featured: false, bookable: true, bookableSlots: [{ id: SLOT_1, slotDate: "2099-02-10T00:00:00.000Z", slotStart: "10:00", slotEnd: "11:00", timezone: "Asia/Kolkata", approvalRequired: true }] }],
      },
      layout: { pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: [{ id: "s1", moduleId: "services.default", config: {}, order: 0, visible: true }] }] },
      theme: { packageId: "neon-dark", colors: { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa" }, typography: { heading: "Inter", body: "Inter" } },
      navigation: [], renderingHints: {},
    };
    const doc = engine.resolve(snap as never);
    const section = doc.pages[0].sections.find((s) => s.moduleId === "services.default");
    const data = (section?.config.resolvedData as Array<Record<string, unknown>>) ?? [];
    expect(data[0].bookable).toBe(true);
    expect((data[0].bookableSlots as unknown[]).length).toBe(1);
    expect(data[0].bookableSlots[0]).toMatchObject({ id: SLOT_1, slotStart: "10:00" });
  });

  it("legacy snapshot without service booking fields renders safely (bookable defaults false)", () => {
    const snap = {
      _schema: "creatorstore.snapshot", _version: 1,
      metadata: { version: 1, publishedAt: "2026-01-01T00:00:00Z", previousVersion: null, correlationId: "x", generatedBy: "dashboard" },
      content: {
        identity: { name: "C", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
        hero: { title: "Hi", subtitle: "", description: "" },
        products: [], gallery: [], links: [], seo: { title: "", description: "" },
        services: [{ id: SERVICE_A, title: "Legacy", description: null, price: 100, duration: null, imageUrl: null, category: null, featured: false }],
      },
      layout: { pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: [{ id: "s1", moduleId: "services.default", config: {}, order: 0, visible: true }] }] },
      theme: { packageId: "neon-dark", colors: { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa" }, typography: { heading: "Inter", body: "Inter" } },
      navigation: [], renderingHints: {},
    };
    const doc = engine.resolve(snap as never);
    const section = doc.pages[0].sections.find((s) => s.moduleId === "services.default");
    const data = (section?.config.resolvedData as Array<Record<string, unknown>>) ?? [];
    expect(data[0].bookable).toBe(false);
    expect((data[0].bookableSlots as unknown[]).length).toBe(0);
  });
});
