// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import {
  ADMIN_NAV,
  ADMIN_NAV_ICON_KEYS,
  type NavConfigWire,
} from "@/config/admin-nav";
import { filterNavForPlan, toNavWire } from "@/lib/capabilities/nav-visibility";
import {
  adminNavIconRegistry,
  resolveAdminNavIcon,
  FALLBACK_NAV_ICON,
} from "@/config/admin-nav-icons";
import { AdminSidebar } from "@/app/admin/_components/admin-sidebar";

// RCCF-70.6.2 — Admin Navigation RSC Serialization Closure.
// The admin shell previously shipped Lucide `forwardRef` icon components from
// the Server layout across the RSC boundary, causing every /admin/* route to
// 500 ("Unsupported Server Component type: forwardRef"). These tests pin the
// new wire contract: plain serializable `iconKey` strings server-side, icon
// presentation resolved client-side via `adminNavIconRegistry`.

class NoopIO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
class NoopRO { observe() {} unobserve() {} disconnect() {} }

const h = vi.hoisted(() => ({
  mockUsePathname: vi.fn(() => "/admin/dashboard"),
  mockSignOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => h.mockUsePathname(), useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next-auth/react", () => ({ signOut: h.mockSignOut }));

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

function assertDeepSerializable(value: unknown, path: string): void {
  if (value === null || value === undefined) return;
  const type = typeof value;
  if (type === "function") throw new Error(`Non-serializable function at ${path}`);
  if (type !== "object") return;
  if (typeof (value as { $$typeof?: unknown }).$$typeof !== "undefined") {
    throw new Error(`React component/element ($$typeof) at ${path}`);
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    assertDeepSerializable(child, `${path}.${key}`);
  }
}

describe("RCCF-70.6.2 — navigation wire serialization", () => {
  it("produces a deep-serializable wire navigation (no functions/React objects)", () => {
    const wire = toNavWire(filterNavForPlan(ADMIN_NAV, "creator_enterprise"));
    assertDeepSerializable(wire, "nav");
    // Plain object/string array shape (sanity).
    expect(JSON.parse(JSON.stringify(wire))).toEqual(wire);
  });

  it("emits only icon keys that resolve in the client registry", () => {
    // Unfiltered ADMIN_NAV is the superset of every plan projection, so this
    // covers all canonical icons — not just one plan's subset.
    const wire = toNavWire(ADMIN_NAV);
    const keys = new Set<string>();
    for (const group of wire.groups) for (const item of group.items) keys.add(item.iconKey);
    for (const item of wire.footer) keys.add(item.iconKey);

    expect(keys.size).toBeGreaterThan(0);
    for (const key of keys) {
      expect(adminNavIconRegistry, `registry missing icon key "${key}"`).toHaveProperty(key);
    }
    // The canonical key list is fully covered by the registry (fallback-proof).
    for (const key of ADMIN_NAV_ICON_KEYS) {
      expect(adminNavIconRegistry, `registry missing canonical key "${key}"`).toHaveProperty(key);
    }
  });

  it("preserves capability filtering with zero capability metadata leakage", () => {
    const filtered = filterNavForPlan(ADMIN_NAV, "creator_launch");
    const wire = toNavWire(filtered);
    const hrefs = wire.groups.flatMap((g) => g.items.map((i) => i.href));
    const canonicalHrefs = filtered.groups.flatMap((g) => g.items.map((i) => i.href));

    // Wire mirrors the server projection exactly (no client-side re-filtering).
    expect(hrefs).toEqual(canonicalHrefs);
    expect(hrefs).not.toContain("/admin/bookings"); // max_bookings = 0 on launch
    expect(hrefs).toContain("/admin/dashboard");
    expect(wire.footer.length).toBeGreaterThan(0);

    // Capability/plan metadata never crosses the boundary.
    for (const item of [...wire.groups.flatMap((g) => g.items), ...wire.footer]) {
      expect(item).not.toHaveProperty("requiredCapability");
      expect(item).not.toHaveProperty("requiredLimitAbove");
      expect(item).toHaveProperty("iconKey");
    }
  });
});

describe("RCCF-70.6.2 — AdminSidebar wire rendering", () => {
  const wireNav: NavConfigWire = {
    groups: [
      { items: [
        { href: "/admin/dashboard", label: "Dashboard", iconKey: "LayoutDashboard" },
      ]},
      {
        label: "Content", collapsible: true,
        items: [
          { href: "/admin/gallery", label: "Gallery", iconKey: "Image", badge: "pending" },
        ],
      },
    ],
    footer: [],
  };

  it("renders labels, hrefs, icons, badges, and active state from the wire", () => {
    render(<AdminSidebar open={false} onClose={() => {}} nav={wireNav} />);
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Gallery")).toBeTruthy();
    expect(screen.getByText("Content")).toBeTruthy();
    expect(screen.getByText("•")).toBeTruthy(); // pending badge

    // Icons resolve from the registry into real <svg> elements.
    expect(document.querySelectorAll("svg").length).toBeGreaterThan(0);

    const dashboard = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboard.getAttribute("aria-current")).toBe("page");
    expect(dashboard.getAttribute("href")).toBe("/admin/dashboard");
    expect(screen.getByRole("link", { name: /gallery/i }).getAttribute("href")).toBe("/admin/gallery");
  });

  it("falls back to a safe icon without crashing for an unknown iconKey", () => {
    const unknownNav: NavConfigWire = {
      groups: [{ items: [{ href: "/admin/x", label: "X", iconKey: "NotARealIcon" as never }] }],
      footer: [],
    };
    expect(() => render(<AdminSidebar open={false} onClose={() => {}} nav={unknownNav} />)).not.toThrow();
    expect(screen.getByText("X")).toBeTruthy();
    // Deterministic fallback: unknown keys resolve to the safe Menu icon.
    expect(resolveAdminNavIcon("NotARealIcon")).toBe(FALLBACK_NAV_ICON);
    expect(resolveAdminNavIcon("Menu")).toBe(FALLBACK_NAV_ICON);
  });
});

describe("RCCF-70.6.2 — wire contract architecture guardrails", () => {
  function interfaceBlock(src: string, name: string): string {
    const start = src.indexOf(`interface ${name}`);
    expect(start, `${name} interface should exist`).toBeGreaterThanOrEqual(0);
    const end = src.indexOf("\n}", start);
    return src.slice(start, end);
  }

  it("wire interfaces embed no React components or capability metadata", () => {
    const src = readFileSync("src/config/admin-nav.ts", "utf8");
    expect(interfaceBlock(src, "NavItemWire")).toContain("iconKey");
    for (const iface of ["NavItemWire", "NavGroupWire", "NavConfigWire"]) {
      expect(interfaceBlock(src, iface), `${iface} must not carry icon: LucideIcon`).not.toContain("icon:");
    }
    expect(interfaceBlock(src, "NavItemWire")).not.toContain("requiredCapability");
    expect(interfaceBlock(src, "NavItemWire")).not.toContain("requiredLimitAbove");
  });

  it("the Server → Client boundary consumes only the wire contract", () => {
    const layout = readFileSync("src/app/admin/layout.tsx", "utf8");
    expect(layout).toContain("toNavWire");

    const client = readFileSync("src/app/admin/_components/admin-layout-client.tsx", "utf8");
    expect(client).toContain("NavConfigWire");
    expect(client).not.toMatch(/\bNavConfig\b/); // canonical NavConfig must not leak to the client

    const sidebar = readFileSync("src/app/admin/_components/admin-sidebar.tsx", "utf8");
    expect(sidebar).not.toContain("filterNavForPlan");
    expect(sidebar).not.toContain("capabilityService");
    expect(sidebar).not.toContain("item.icon;");
    expect(sidebar).toContain("resolveAdminNavIcon");
    expect(sidebar).toContain("nav.groups.map");
  });
});
