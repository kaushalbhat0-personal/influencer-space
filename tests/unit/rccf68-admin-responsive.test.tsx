// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";

// RCCF-68.3.4 — Stitch Creator Admin shell & dashboard responsive foundation.
// Presentation-only structural/behavioral assertions. Backend/action/authorization
// surfaces are mocked or untouched; nothing here asserts new backend behavior.

class NoopIO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
class NoopRO { observe() {} unobserve() {} disconnect() {} }

const h = vi.hoisted(() => ({
  mockUsePathname: vi.fn(() => "/admin/dashboard"),
  mockSignOut: vi.fn(),
  mockListAssets: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => h.mockUsePathname(), useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next-auth/react", () => ({ signOut: h.mockSignOut }));
vi.mock("@/actions/media-library.actions", () => ({
  listAssets: h.mockListAssets,
  purgeAsset: vi.fn(),
  replaceAsset: vi.fn(),
  deleteAssetsBulk: vi.fn(),
}));
vi.mock("@/lib/media/client-upload", () => ({ uploadFileWithProgress: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  BUCKET: "influencer-images",
  supabaseClient: {},
  supabaseAdmin: {},
}));
// Message actions import the tenant context + Next cache chain; stub them so the
// messages-list renders in jsdom without a server-side tenant resolver.
vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(async () => null),
}));
vi.mock("next/cache", () => ({ cache: (fn: unknown) => fn, revalidatePath: vi.fn() }));
vi.mock("@/actions/contact.actions", () => ({
  markMessageAsRead: vi.fn(async () => ({ success: true })),
  deleteMessage: vi.fn(async () => ({ success: true })),
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  (globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
  (globalThis as Record<string, unknown>).ResizeObserver = NoopRO;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({ matches: false, media: q, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
  h.mockUsePathname.mockReturnValue("/admin/dashboard");
});

// A minimal wire-safe nav (mirrors ADMIN_NAV → filterNavForPlan → toNavWire output).
import type { NavConfigWire } from "@/config/admin-nav";
import { AdminSidebar } from "@/app/admin/_components/admin-sidebar";
import { GamesList } from "@/app/admin/games/_components/games-list";
import { MessagesList } from "@/app/admin/messages/_components/messages-list";

const TEST_NAV: NavConfigWire = {
  groups: [
    { items: [
      { href: "/admin/dashboard", label: "Dashboard", iconKey: "LayoutDashboard" },
      { href: "/admin/create", label: "Create Website", iconKey: "Wand2" },
    ]},
    {
      label: "Content", collapsible: true,
      items: [
        { href: "/admin/gallery", label: "Gallery", iconKey: "Image" },
        { href: "/admin/links", label: "Links", iconKey: "Link2" },
      ],
    },
  ],
  footer: [
    { href: "", label: "View Website", iconKey: "ExternalLink" },
    { href: "", label: "Sign Out", iconKey: "LogOut" },
  ],
};

// ── Sidebar ────────────────────────────────────────────────
describe("RCCF-68.3.4 — admin sidebar", () => {
  it("renders the desktop sidebar with capability-filtered navigation", () => {
    render(<AdminSidebar open={false} onClose={() => {}} nav={TEST_NAV} />);
    expect(screen.getByRole("navigation", { name: "Admin navigation" })).toBeTruthy();
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Content")).toBeTruthy();
    expect(screen.getByText("Gallery")).toBeTruthy();
  });

  it("opens the mobile drawer and shows navigation", () => {
    render(<AdminSidebar open onClose={() => {}} nav={TEST_NAV} />);
    expect(screen.getByRole("dialog", { name: "Admin navigation" })).toBeTruthy();
    expect(screen.getByText("Dashboard")).toBeTruthy();
  });

  it("Escape closes the drawer", () => {
    const onClose = vi.fn();
    render(<AdminSidebar open onClose={onClose} nav={TEST_NAV} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop click closes the drawer", () => {
    const onClose = vi.fn();
    const { container } = render(<AdminSidebar open onClose={onClose} nav={TEST_NAV} />);
    const backdrop = container.querySelector(".bg-black\\/60");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("body scroll is locked while the drawer is open and restored on close", () => {
    const { unmount } = render(<AdminSidebar open onClose={() => {}} nav={TEST_NAV} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("focus is moved into the drawer and restored to the trigger on close", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount, container } = render(<AdminSidebar open onClose={() => {}} nav={TEST_NAV} />);
    await waitFor(() => {
      // Focus lands on the first focusable inside the drawer (the brand link).
      const drawer = container.querySelector('aside[role="dialog"]');
      expect(drawer?.contains(document.activeElement)).toBe(true);
    });
    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("capability-filtered navigation is preserved (same filtered items render)", () => {
    render(<AdminSidebar open={false} onClose={() => {}} nav={TEST_NAV} />);
    // The filtered nav (already passed in) is rendered verbatim — no duplication.
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(
      expect.arrayContaining(["Dashboard", "Create Website", "Gallery", "Links"]),
    );
  });
});

// ── Dashboard ──────────────────────────────────────────────
describe("RCCF-68.3.4 — dashboard responsive foundation", () => {
  it("metric grid uses responsive columns (no hardcoded 3-col break)", () => {
    const source = readFileSync("src/components/layout/Container.tsx", "utf8");
    expect(source).toContain("grid-cols-1 sm:grid-cols-2 xl:grid-cols-4");
  });

  it("dashboard grid stacks on mobile and expands on desktop", () => {
    const source = readFileSync("src/components/layout/Container.tsx", "utf8");
    expect(source).toContain("grid-cols-1 lg:grid-cols-3");
    expect(source).toContain("lg:col-span-2");
  });

  it("dashboard quick cards use responsive grid columns", () => {
    const source = readFileSync("src/features/dashboard/components/dashboard-page.tsx", "utf8");
    expect(source).toContain("grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12");
  });

  it("charts use ResponsiveContainer width 100% (shrinkable)", () => {
    const revenue = readFileSync("src/components/analytics/RevenueAnalytics.tsx", "utf8");
    const orders = readFileSync("src/components/analytics/OrderAnalytics.tsx", "utf8");
    expect(revenue).toContain('<ResponsiveContainer width="100%"');
    expect(orders).toContain('<ResponsiveContainer width="100%"');
  });

  it("analytics fallback skeleton does not overflow at 320px", () => {
    const source = readFileSync("src/app/admin/analytics/page.tsx", "utf8");
    expect(source).not.toContain("h-8 w-96");
    expect(source).toContain("max-w-96");
  });
});

// ── Media Library ──────────────────────────────────────────
describe("RCCF-68.3.4 — media library responsive", () => {
  it("grid responds to available width (2-col base, 4-col desktop)", async () => {
    const { MediaLibrary } = await import("@/app/admin/media/_components/media-library");
    const asset = {
      id: "a1", filename: "f", originalFilename: "photo.jpg", mimeType: "image/jpeg", size: 1024,
      width: 100, height: 100, duration: null, publicUrl: null, storageProvider: "local",
      referenceCount: 0, status: "ACTIVE", processingStatus: "DONE", processingError: null,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", used: false, usages: [],
    };
    h.mockListAssets.mockResolvedValue({ success: true, assets: [asset], total: 1 });
    const { container } = render(<MediaLibrary />);
    await waitFor(() => expect(h.mockListAssets).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector(".grid.grid-cols-2")).toBeTruthy());
    const grid = container.querySelector(".grid.grid-cols-2");
    expect(grid?.className).toContain("sm:grid-cols-3");
    expect(grid?.className).toContain("xl:grid-cols-4");
  });

  it("detail rail becomes full-width below lg (no fixed w-80 on mobile)", async () => {
    const { MediaLibrary } = await import("@/app/admin/media/_components/media-library");
    const asset = {
      id: "a1", filename: "f", originalFilename: "photo.jpg", mimeType: "image/jpeg", size: 1024,
      width: 100, height: 100, duration: null, publicUrl: null, storageProvider: "local",
      referenceCount: 0, status: "ACTIVE", processingStatus: "DONE", processingError: null,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", used: false, usages: [],
    };
    h.mockListAssets.mockResolvedValue({ success: true, assets: [asset], total: 1 });
    const { container } = render(<MediaLibrary />);
    // Grid renders and clicking a card opens the detail rail.
    const cards = await screen.findAllByText("photo.jpg");
    expect(cards.length).toBeGreaterThan(0);
    const card = cards[0].closest("div[class*='aspect-square']");
    if (card) {
      fireEvent.click(card);
      await waitFor(() => expect(container.querySelector(".lg\\:w-80")).toBeTruthy());
    }
  });

  it("upload action remains accessible (labeled Upload button)", async () => {
    const { MediaLibrary } = await import("@/app/admin/media/_components/media-library");
    h.mockListAssets.mockResolvedValue({ success: true, assets: [], total: 0 });
    render(<MediaLibrary />);
    await waitFor(() => expect(h.mockListAssets).toHaveBeenCalled());
    // The header upload control is a <label> wrapping a hidden file input.
    const upload = screen.getByText("Upload");
    expect(upload).toBeTruthy();
  });

  it("essential asset actions are touch-accessible (filename + actions visible without hover)", () => {
    const source = readFileSync("src/app/admin/media/_components/media-library.tsx", "utf8");
    // The hover-reveal is desktop-only; the meta is always visible below lg.
    expect(source).toContain("lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100");
    expect(source).not.toContain('className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 opacity-0');
  });
});

// ── Games ──────────────────────────────────────────────────
describe("RCCF-68.3.4 — games touch-visible actions", () => {
  it("essential actions are not hover-only", () => {
    const source = readFileSync("src/app/admin/games/_components/games-list.tsx", "utf8");
    expect(source).not.toContain("opacity-0 transition-opacity group-hover:opacity-100");
    expect(source).not.toContain("group-hover:opacity-100");
  });

  it("edit and delete actions render as accessible buttons/links with labels", () => {
    const game = { id: "g1", name: "Chess", genre: "Strategy", isActive: true, logoUrl: null, createdAt: "2026-01-01", updatedAt: "2026-01-01" };
    render(<GamesList games={[game as never]} />);
    expect(screen.getByRole("link", { name: /edit chess/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /delete chess/i })).toBeTruthy();
  });
});

// ── Messages ───────────────────────────────────────────────
describe("RCCF-68.3.4 — messages responsive", () => {
  it("message actions are not hover-only", () => {
    const source = readFileSync("src/app/admin/messages/_components/messages-list.tsx", "utf8");
    expect(source).not.toContain("group-hover:opacity-100");
  });

  it("message content and email wrap safely (break-words)", () => {
    const source = readFileSync("src/app/admin/messages/_components/messages-list.tsx", "utf8");
    expect(source).toContain("break-words");
    expect(source).toContain("break-all");
  });

  it("mobile list keeps message + actions reachable", () => {
    const message = { id: "m1", name: "Alice", email: "alice@example.com", message: "Hello, this is a long message that should wrap", isRead: false, createdAt: "2026-01-01T00:00:00Z" };
    render(<MessagesList messages={[message as never]} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Mark Read")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });
});

// ── Appearance ─────────────────────────────────────────────
describe("RCCF-68.3.4 — appearance responsive", () => {
  it("control layout stacks on mobile (flex-col below lg)", () => {
    const source = readFileSync("src/app/admin/appearance/_components/appearance-manager.tsx", "utf8");
    expect(source).toContain("flex flex-col gap-6 lg:flex-row lg:items-start");
  });

  it("color presets avoid fixed 4-col on the narrowest screens", () => {
    const source = readFileSync("src/app/admin/appearance/_components/appearance-manager.tsx", "utf8");
    expect(source).toContain("grid grid-cols-3 gap-3 sm:grid-cols-4");
  });

  it("layout density buttons wrap on narrow screens", () => {
    const source = readFileSync("src/app/admin/appearance/_components/appearance-manager.tsx", "utf8");
    expect(source).toContain("mt-3 flex flex-wrap gap-2");
  });

  it("preview shell is full-width on mobile (no fixed 300px)", () => {
    const source = readFileSync("src/components/admin/PreviewShell.tsx", "utf8");
    expect(source).toContain("w-full shrink-0 lg:w-[380px]");
  });
});

// ── Architecture preservation ──────────────────────────────
describe("RCCF-68.3.4 — architecture preservation", () => {
  it("no new server action is introduced", () => {
    const sidebar = readFileSync("src/app/admin/_components/admin-sidebar.tsx", "utf8");
    expect(sidebar).not.toContain('from "@/actions/');
    const media = readFileSync("src/app/admin/media/_components/media-library.tsx", "utf8");
    const mediaActions = media.match(/from "@\/actions\/[\w.-]+"/g) ?? [];
    const allowed = ["@/actions/media-library.actions"];
    for (const imp of mediaActions) {
      const clean = imp.replace('from "', "").replace('"', "");
      expect(allowed, `unexpected media action ${clean}`).toContain(clean);
    }
  });

  it("capability matrix is not duplicated in the responsive UI", () => {
    const sidebar = readFileSync("src/app/admin/_components/admin-sidebar.tsx", "utf8");
    expect(sidebar).not.toContain("filterNavForPlan");
    expect(sidebar).not.toContain("capabilityService");
    expect(sidebar).not.toContain("requiredCapability &&");
    // The nav prop is rendered verbatim (already filtered server-side).
    expect(sidebar).toContain("nav.groups.map");
  });

  it("no schema/migration/capability changes in this RCCF", () => {
    const files = [
      "src/app/admin/_components/admin-sidebar.tsx",
      "src/app/admin/media/_components/media-library.tsx",
      "src/app/admin/games/_components/games-list.tsx",
      "src/app/admin/messages/_components/messages-list.tsx",
      "src/app/admin/appearance/_components/appearance-manager.tsx",
    ];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toContain("@/generated/prisma");
    }
  });

  it("tenant authorization and existing actions are preserved", () => {
    const gamesPage = readFileSync("src/app/admin/games/page.tsx", "utf8");
    expect(gamesPage).toContain("session?.user?.tenantId");
    const gamesList = readFileSync("src/app/admin/games/_components/games-list.tsx", "utf8");
    expect(gamesList).toContain('deleteGame } from "@/actions/games.actions"');
    const messagesList = readFileSync("src/app/admin/messages/_components/messages-list.tsx", "utf8");
    expect(messagesList).toContain("MessageActions");
  });
});
