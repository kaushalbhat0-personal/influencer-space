import { describe, it, expect, vi, beforeEach } from "vitest";

// ── RCCF-72.10 — Courses/Services Structured Error Remediation ─────────────
// Closes 72.3-F1: createCourse/createService previously threw the raw
// `enforceContentLimit` rejection across the server-action boundary, which the
// client could not surface ("500 + unhandled pageerror, no UX"). They now
// return the shared structured result contract (content-limit.result.ts):
//   { success: true; data } | { success: false; error; featureKey; used; limit; suggestedUpgrade? }
// and never create a record when the limit is rejected.

const h = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockEnforceContentLimit: vi.fn(),
  // RCCF-72.15B: the core-content create actions now route through the
  // transactional `withLaunchCoreContentCapacity` wrapper (which internally
  // calls enforceContentLimit for the global Launch ceiling).
  mockWithCapacity: vi.fn(),
  mockCourseCreate: vi.fn(),
  mockServiceCreate: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockAfterContentChange: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: h.mockRevalidatePath }));
vi.mock("@/lib/publishing/content-change", () => ({ afterContentChange: h.mockAfterContentChange }));
vi.mock("@/modules/billing/application/content-limit.enforcement", () => ({
  enforceContentLimit: h.mockEnforceContentLimit,
  withLaunchCoreContentCapacity: h.mockWithCapacity,
}));

vi.mock("@/features/courses/service", () => ({
  courseService: { list: vi.fn(), getById: vi.fn(), create: h.mockCourseCreate, update: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/features/services/service", () => ({
  serviceService: { list: vi.fn(), getById: vi.fn(), create: h.mockServiceCreate, update: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    offering: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    booking: { create: vi.fn() },
  },
}));

import { createCourse } from "@/features/courses/actions";
import { createService } from "@/features/services/actions";

const courseData = {
  id: "c1",
  title: "Intro Course",
  description: null,
  price: 0,
  imageUrl: null,
  category: null,
  featured: false,
  status: "DRAFT",
  moduleCount: 0,
  lessonCount: 0,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

const serviceData = {
  id: "s1",
  title: "Consult",
  description: null,
  price: 1000,
  duration: null,
  imageUrl: null,
  category: null,
  featured: false,
  status: "PUBLISHED",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  bookable: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.mockGetServerSession.mockResolvedValue({ user: { id: "u1", tenantId: "t1" } });
  h.mockEnforceContentLimit.mockResolvedValue({ ok: true, featureKey: "max_courses", used: 1, limit: -1 });
  // Default: capacity available → run the create work inside the transaction.
  h.mockWithCapacity.mockImplementation(async (_tenantId: string, _featureKey: string, work: (tx: unknown) => Promise<unknown>) => work({}));
  h.mockCourseCreate.mockResolvedValue(courseData);
  h.mockServiceCreate.mockResolvedValue(serviceData);
});

describe("createCourse — RCCF-72.10 structured limit errors", () => {
  it("returns the created course when the limit has headroom", async () => {
    const res = await createCourse({ title: "Intro Course", price: 0 });

    expect(h.mockWithCapacity).toHaveBeenCalledWith("t1", "max_courses", expect.any(Function));
    expect(h.mockCourseCreate).toHaveBeenCalledWith("t1", expect.objectContaining({ title: "Intro Course" }), {});
    expect(res).toEqual({ success: true, data: courseData });
    expect(h.mockRevalidatePath).toHaveBeenCalledWith("/admin/courses");
    expect(h.mockAfterContentChange).toHaveBeenCalledWith("t1");
  });

  it("RCCF-72.15B: rejects with a structured result when the Launch global ceiling is reached and creates nothing", async () => {
    h.mockWithCapacity.mockResolvedValue({
      ok: false,
      featureKey: "max_courses",
      used: 3,
      limit: 3,
      reason: "Core content limit reached (3/3).",
      suggestedUpgrade: "creator_grow",
    });

    const res = await createCourse({ title: "Fourth", price: 0 });

    expect(res.success).toBe(false);
    expect(res.error).toBe("Core content limit reached (3/3).");
    expect(res).toMatchObject({
      success: false,
      featureKey: "max_courses",
      used: 3,
      limit: 3,
      suggestedUpgrade: "creator_grow",
    });
    expect(h.mockCourseCreate).not.toHaveBeenCalled();
    expect(h.mockRevalidatePath).not.toHaveBeenCalled();
    expect(h.mockAfterContentChange).not.toHaveBeenCalled();
  });

  it("returns a generic structured failure when persistence throws (no unhandled rejection)", async () => {
    h.mockCourseCreate.mockRejectedValue(new Error("db down"));

    const res = await createCourse({ title: "Intro Course", price: 0 });

    expect(res).toEqual({ success: false, error: "Failed to create course" });
  });

  it("returns a generic structured failure when the session has no tenant", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "u1" } });

    const res = await createCourse({ title: "Intro Course", price: 0 });

    expect(res).toEqual({ success: false, error: "Failed to create course" });
    expect(h.mockCourseCreate).not.toHaveBeenCalled();
  });
});

describe("createService — RCCF-72.10 structured limit errors", () => {
  it("returns the created service when the limit has headroom", async () => {
    const res = await createService({ title: "Consult", price: 1000 });

    expect(h.mockWithCapacity).toHaveBeenCalledWith("t1", "max_services", expect.any(Function));
    expect(h.mockServiceCreate).toHaveBeenCalledWith("t1", expect.objectContaining({ title: "Consult" }), {});
    expect(res).toEqual({ success: true, data: serviceData });
    expect(h.mockRevalidatePath).toHaveBeenCalledWith("/admin/services");
    expect(h.mockAfterContentChange).toHaveBeenCalledWith("t1");
  });

  it("RCCF-72.15B: rejects with a structured result when the Launch global ceiling is reached and creates nothing", async () => {
    h.mockWithCapacity.mockResolvedValue({
      ok: false,
      featureKey: "max_services",
      used: 3,
      limit: 3,
      reason: "Core content limit reached (3/3).",
      suggestedUpgrade: "creator_grow",
    });

    const res = await createService({ title: "Overflow", price: 1 });

    expect(res.success).toBe(false);
    expect(res.error).toBe("Core content limit reached (3/3).");
    expect(res).toMatchObject({
      success: false,
      featureKey: "max_services",
      used: 3,
      limit: 3,
      suggestedUpgrade: "creator_grow",
    });
    expect(h.mockServiceCreate).not.toHaveBeenCalled();
    expect(h.mockRevalidatePath).not.toHaveBeenCalled();
    expect(h.mockAfterContentChange).not.toHaveBeenCalled();
  });

  it("returns a generic structured failure when persistence throws (no unhandled rejection)", async () => {
    h.mockServiceCreate.mockRejectedValue(new Error("db down"));

    const res = await createService({ title: "Consult", price: 1000 });

    expect(res).toEqual({ success: false, error: "Failed to create service" });
  });

  it("returns a generic structured failure when the session has no tenant", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "u1" } });

    const res = await createService({ title: "Consult", price: 1000 });

    expect(res).toEqual({ success: false, error: "Failed to create service" });
    expect(h.mockServiceCreate).not.toHaveBeenCalled();
  });
});