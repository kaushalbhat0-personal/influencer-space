import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

// RCCF-63.2 — Creator authorization hardening (games IDOR, message tenant header)
// + navigation truth.

const v = vi.hoisted(() => {
  const games: Array<{ id: string; tenantId: string; name: string }> = [];
  const messages: Array<{ id: string; tenantId: string; isRead: boolean }> = [];
  const hoisted = {
    games, messages,
    courses: [] as Array<{ id: string; tenantId: string; type: string; title: string; price: number; slug: string; status: string; createdAt: Date; description: string | null; metadata: Record<string, unknown> }>,
    session: { user: { id: "uA", tenantId: "tenant-A", role: "ADMIN" } },
    reset: () => {
      games.length = 0; messages.length = 0; hoisted.courses.length = 0;
      hoisted.session = { user: { id: "uA", tenantId: "tenant-A", role: "ADMIN" } };
    },
    mockLogAction: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockEnforceContentLimit: vi.fn(),
    mockAfterContentChange: vi.fn(),
    mockGetTenantContext: vi.fn(),
  };
  return hoisted;
});

vi.mock("next-auth", () => ({ getServerSession: async () => v.session }));
vi.mock("next/cache", () => ({ revalidatePath: v.mockRevalidatePath }));
vi.mock("@/lib/audit", () => ({ logAction: v.mockLogAction }));
vi.mock("@/modules/billing/application/content-limit.enforcement", () => ({ enforceContentLimit: v.mockEnforceContentLimit }));
vi.mock("@/lib/publishing/content-change", () => ({ afterContentChange: v.mockAfterContentChange }));
// The public form resolver (host-derived) is intentionally kept — the protected
// mutations must NOT use it.
vi.mock("@/lib/tenant", () => ({ getTenantContext: v.mockGetTenantContext }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    game: {
      findFirst: async ({ where }: { where: { id: string; tenantId?: string } }) => v.games.find((g) => g.id === where.id && (where.tenantId === undefined || g.tenantId === where.tenantId)) ?? null,
      findMany: async ({ where }: { where: { tenantId?: string } }) => v.games.filter((g) => where.tenantId === undefined || g.tenantId === where.tenantId),
      create: async ({ data }: { data: { tenantId: string; name: string } }) => { const g = { id: `g-${v.games.length + 1}`, ...data }; v.games.push(g); return g; },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { const g = v.games.find((x) => x.id === where.id)!; Object.assign(g, data); return g; },
      delete: async ({ where }: { where: { id: string } }) => { const idx = v.games.findIndex((x) => x.id === where.id); const [g] = v.games.splice(idx, 1); return g; },
      aggregate: async () => ({ _max: { order: 0 } }),
    },
    contactSubmission: {
      findMany: async ({ where }: { where: { tenantId?: string } }) => v.messages.filter((m) => where.tenantId === undefined || m.tenantId === where.tenantId),
      findFirst: async ({ where }: { where: { id: string; tenantId?: string } }) => v.messages.find((m) => m.id === where.id && (where.tenantId === undefined || m.tenantId === where.tenantId)) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => { const m = { id: `m-${v.messages.length + 1}`, isRead: false, ...data }; v.messages.push(m); return m; },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { const m = v.messages.find((x) => x.id === where.id)!; Object.assign(m, data); return m; },
      delete: async ({ where }: { where: { id: string } }) => { const idx = v.messages.findIndex((x) => x.id === where.id); const [m] = v.messages.splice(idx, 1); return m; },
    },
    offering: {
      findMany: async ({ where }: { where: { tenantId?: string; type?: string } }) => v.courses.filter((c) => (where.tenantId === undefined || c.tenantId === where.tenantId) && (where.type === undefined || c.type === where.type)),
      findFirst: async ({ where }: { where: { id: string; tenantId?: string; type?: string } }) => v.courses.find((c) => c.id === where.id && (where.tenantId === undefined || c.tenantId === where.tenantId) && (where.type === undefined || c.type === where.type)) ?? null,
      create: async ({ data }: { data: { tenantId: string; type: string; title: string; price: number; slug: string; status: string } }) => { const c = { id: `c-${v.courses.length + 1}`, createdAt: new Date(), description: null, currency: "INR", metadata: {}, ...data }; v.courses.push(c); return c; },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { const c = v.courses.find((x) => x.id === where.id)!; Object.assign(c, data); return c; },
      delete: async ({ where }: { where: { id: string } }) => { const idx = v.courses.findIndex((x) => x.id === where.id); const [c] = v.courses.splice(idx, 1); return c; },
    },
  },
}));

import { updateGame, deleteGame } from "@/actions/games.actions";
import { markMessageAsRead, deleteMessage, submitContact } from "@/actions/contact.actions";
import { getCourse, deleteCourse } from "@/features/courses/actions";
import { courseService } from "@/features/courses/service";

function form(patch: Record<string, string>) {
  const f = new FormData();
  for (const [k, val] of Object.entries({ name: "Game", logoUrl: "", description: "", genre: "", ...patch })) f.set(k, val);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  v.reset();
  v.mockLogAction.mockResolvedValue(undefined);
  v.mockAfterContentChange.mockResolvedValue(undefined);
  v.mockEnforceContentLimit.mockResolvedValue({ ok: true });
  v.games.push({ id: "game-A", tenantId: "tenant-A", name: "A" });
  v.games.push({ id: "game-B", tenantId: "tenant-B", name: "B" });
  v.messages.push({ id: "msg-A", tenantId: "tenant-A", isRead: false });
  v.messages.push({ id: "msg-B", tenantId: "tenant-B", isRead: false });
  v.courses.push({ id: "course-A", tenantId: "tenant-A", type: "course", title: "A", price: 100, slug: "a", status: "draft", createdAt: new Date(), description: null, metadata: {} });
  v.courses.push({ id: "course-B", tenantId: "tenant-B", type: "course", title: "B", price: 200, slug: "b", status: "draft", createdAt: new Date(), description: null, metadata: {} });
});

describe("RCCF-63.2 — Games IDOR hardening", () => {
  it("Creator A can update A's game", async () => {
    const res = await updateGame({ success: false }, form({ id: "game-A", name: "A2" }));
    expect(res.success).toBe(true);
    expect(v.games.find((g) => g.id === "game-A")!.name).toBe("A2");
  });

  it("Creator A CANNOT update B's game", async () => {
    const res = await updateGame({ success: false }, form({ id: "game-B", name: "HACKED" }));
    expect(res.success).toBe(false);
    expect(v.games.find((g) => g.id === "game-B")!.name).toBe("B");
  });

  it("Creator A can delete A's game", async () => {
    const res = await deleteGame("game-A");
    expect(res.success).toBe(true);
    expect(v.games.some((g) => g.id === "game-A")).toBe(false);
  });

  it("Creator A CANNOT delete B's game", async () => {
    const res = await deleteGame("game-B");
    expect(res.success).toBe(false);
    expect(v.games.some((g) => g.id === "game-B")).toBe(true);
  });

  it("Creator A CANNOT read B's game (server-side ownership)", async () => {
    v.games.length = 0;
    v.games.push({ id: "game-B", tenantId: "tenant-B", name: "B" });
    const res = await updateGame({ success: false }, form({ id: "game-B", name: "X" }));
    expect(res.success).toBe(false);
    expect(v.games.find((g) => g.id === "game-B")!.name).toBe("B");
  });

  it("unauthenticated access is rejected", async () => {
    v.session = { user: null as never };
    const res = await deleteGame("game-A");
    expect(res.success).toBe(false);
    expect(v.games.some((g) => g.id === "game-A")).toBe(true);
  });

  it("a client-supplied tenant cannot bypass ownership (the id is the only input)", async () => {
    // The action accepts only the game id — there is no client tenant field to spoof.
    const res = await updateGame({ success: false }, form({ id: "game-B", tenantId: "tenant-A", name: "X" }));
    expect(res.success).toBe(false);
    expect(v.games.find((g) => g.id === "game-B")!.name).toBe("B");
  });
});

describe("RCCF-63.2 — message tenant authorization", () => {
  it("Creator A can mark A's message read", async () => {
    const res = await markMessageAsRead("msg-A");
    expect(res.success).toBe(true);
    expect(v.messages.find((m) => m.id === "msg-A")!.isRead).toBe(true);
  });

  it("Creator A CANNOT mark B's message read", async () => {
    const res = await markMessageAsRead("msg-B");
    expect(res.success).toBe(false);
    expect(v.messages.find((m) => m.id === "msg-B")!.isRead).toBe(false);
  });

  it("Creator A CANNOT delete B's message", async () => {
    const res = await deleteMessage("msg-B");
    expect(res.success).toBe(false);
    expect(v.messages.some((m) => m.id === "msg-B")).toBe(true);
  });

  it("a spoofed x-tenant-host header cannot cross the tenant boundary on mutations", async () => {
    // Host-resolver returns tenant-B, but the protected mutation must use the
    // authenticated session (tenant-A) — so B's message is untouched.
    v.mockGetTenantContext.mockResolvedValue({ id: "tenant-B", name: "B", subdomain: "b" });
    const res = await markMessageAsRead("msg-B");
    expect(res.success).toBe(false);
    expect(v.messages.find((m) => m.id === "msg-B")!.isRead).toBe(false);
  });

  it("the authenticated session tenant wins over client-controlled tenant information", async () => {
    v.mockGetTenantContext.mockResolvedValue({ id: "tenant-B", name: "B", subdomain: "b" });
    const del = await deleteMessage("msg-B");
    expect(del.success).toBe(false);
    expect(v.messages.some((m) => m.id === "msg-B")).toBe(true);
  });

  it("the public contact form still resolves the tenant from the host (unchanged public path)", async () => {
    v.mockGetTenantContext.mockResolvedValue({ id: "tenant-B", name: "B", subdomain: "b" });
    const res = await submitContact({ success: false }, (() => {
      const f = new FormData();
      f.set("name", "Visitor"); f.set("email", "v@x.test"); f.set("message", "Hello there world");
      return f;
    })());
    expect(res.success).toBe(true);
    expect(v.messages.some((m) => m.tenantId === "tenant-B" && m.name === "Visitor")).toBe(true);
  });
});

describe("RCCF-63.3 — Course authorization hardening", () => {
  it("A can read A's course", async () => {
    const course = await getCourse("course-A");
    expect(course?.id).toBe("course-A");
  });

  it("A CANNOT read B's course (foreign course is not found, no existence leak)", async () => {
    const course = await getCourse("course-B");
    expect(course).toBeNull();
    expect(course).not.toEqual(expect.objectContaining({ id: "course-B" }));
  });

  it("A can update A's course", async () => {
    await courseService.update("tenant-A", "course-A", { title: "A2", price: 150, status: "PUBLISHED" });
    expect(v.courses.find((c) => c.id === "course-A")!.title).toBe("A2");
  });

  it("A CANNOT update B's course", async () => {
    await expect(courseService.update("tenant-A", "course-B", { title: "HACKED", price: 1, status: "DRAFT" }))
      .rejects.toThrow(/Course not found/);
    expect(v.courses.find((c) => c.id === "course-B")!.title).toBe("B");
  });

  it("A can delete A's course", async () => {
    await deleteCourse("course-A");
    expect(v.courses.some((c) => c.id === "course-A")).toBe(false);
  });

  it("A CANNOT delete B's course (truthful not-found, no mutation)", async () => {
    await expect(deleteCourse("course-B")).rejects.toThrow(/Course not found/);
    expect(v.courses.some((c) => c.id === "course-B")).toBe(true);
  });

  it("unauthenticated access is rejected", async () => {
    v.session = { user: null as never };
    await expect(getCourse("course-A")).rejects.toThrow(/Unauthorized/);
    expect(v.courses.some((c) => c.id === "course-A")).toBe(true);
  });

  it("client tenant spoofing cannot cross the tenant boundary (the id is the only input)", async () => {
    // getCourse accepts only a course id — there is no client tenant field.
    const res = await getCourse("course-B");
    expect(res).toBeNull();
    expect(v.courses.find((c) => c.id === "course-B")!.title).toBe("B");
  });

  it("list is tenant-scoped", async () => {
    const courses = await courseService.list("tenant-A");
    expect(courses.map((c) => c.id)).toEqual(["course-A"]);
  });
});

describe("RCCF-63.2 — navigation truth", () => {
  it("Blog no longer points to a nonexistent active route", () => {
    const cfg = readFileSync("src/lib/navigation/config.ts", "utf8");
    expect(cfg).not.toMatch(/\/admin\/blog/);
    expect(cfg).not.toMatch(/label: "Blog"/);
  });

  it("Email and AI Assistant are explicitly marked Coming Soon", () => {
    const cfg = readFileSync("src/lib/navigation/config.ts", "utf8");
    expect(cfg).toMatch(/label: "Email".*badge: "Coming Soon"/s);
    expect(cfg).toMatch(/label: "AI Assistant".*badge: "Coming Soon"/s);
    // The overclaimed Email/AI items must not carry a "new" badge.
    expect(cfg.split("\n").find((l) => l.includes('label: "Email"'))).not.toMatch(/badge: "new"/);
    expect(cfg.split("\n").find((l) => l.includes('label: "AI Assistant"'))).not.toMatch(/badge: "new"/);
  });

  it("the live admin sidebar (admin-nav) exposes no Blog/Email/AI entries", () => {
    const nav = readFileSync("src/config/admin-nav.ts", "utf8");
    expect(nav).not.toMatch(/\/admin\/blog/);
    expect(nav).not.toMatch(/\/admin\/email/);
    expect(nav).not.toMatch(/\/admin\/ai-assistant/);
  });
});
