// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";

// RCCF-68.3.5 — Creator Admin CRUD & Billing responsive completion.
// Presentation-only structural/behavioral assertions. Backend/action surfaces
// are mocked or left untouched.

class NoopIO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
class NoopRO { observe() {} unobserve() {} disconnect() {} }

const h = vi.hoisted(() => ({
  mockUseRouter: vi.fn(),
  mockApproveBooking: vi.fn(),
  mockCancelBooking: vi.fn(),
  mockSaveNavigation: vi.fn(),
  mockResetNavigation: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard",
  useRouter: () => h.mockUseRouter,
}));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("@/actions/booking.actions", () => ({
  createBooking: vi.fn(async () => ({ success: false })),
  approveBooking: h.mockApproveBooking,
  cancelBooking: h.mockCancelBooking,
  getBookingSlots: vi.fn(async () => []),
}));
vi.mock("@/actions/navigation.actions", () => ({
  saveNavigation: h.mockSaveNavigation,
  resetNavigation: h.mockResetNavigation,
}));
vi.mock("@/lib/tenant", () => ({ getTenantContext: vi.fn(async () => null) }));
vi.mock("next/cache", () => ({ cache: (fn: unknown) => fn, revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  BUCKET: "influencer-images",
  supabaseClient: {},
  supabaseAdmin: {},
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
  h.mockUseRouter = { refresh: vi.fn() };
  h.mockApproveBooking.mockResolvedValue({ success: true });
  h.mockCancelBooking.mockResolvedValue({ success: true });
  h.mockSaveNavigation.mockResolvedValue({ success: true });
  h.mockResetNavigation.mockResolvedValue({ success: true, data: [] });
});

import { BookingsClient } from "@/app/admin/bookings/_components/bookings-client";
import { NavigationManager } from "@/app/admin/website/navigation/_components/navigation-manager";

function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: "b1", title: "Strategy Call", price: 2000, duration: 60,
    slotDate: new Date("2026-02-10T00:00:00Z") as unknown as string, slotStart: "10:00", slotEnd: "11:00",
    status: "pending", customerName: "Alice", customerEmail: "alice@example.com", customerPhone: "+91 90000 00000",
    notes: null, approvalRequired: true, offering: null,
    ...overrides,
  };
}

// ── Bookings ───────────────────────────────────────────────
describe("RCCF-68.3.5 — bookings responsive", () => {
  it("desktop table representation is preserved (md:table)", () => {
    const source = readFileSync("src/app/admin/bookings/_components/bookings-client.tsx", "utf8");
    expect(source).toContain("hidden w-full text-xs md:table");
    expect(source).toContain("<th className=\"px-4 py-3 text-left\">Date</th>");
  });

  it("mobile representation is a responsive card list (md:hidden)", () => {
    const source = readFileSync("src/app/admin/bookings/_components/bookings-client.tsx", "utf8");
    expect(source).toContain("divide-y divide-white/5 md:hidden");
    expect(source).toContain("min-w-0 flex-1");
  });

  it("booking actions remain accessible and touch-visible", () => {
    // The same booking renders in BOTH the desktop table and the mobile card
    // (CSS visibility), so at least one Approve + Cancel must be present.
    const { getAllByRole } = render(<BookingsClient initialBookings={[booking()] as never} tenantId="t1" />);
    expect(getAllByRole("button", { name: /approve booking/i }).length).toBeGreaterThanOrEqual(1);
    expect(getAllByRole("button", { name: /cancel booking/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("no fixed mobile-breaking width remains in the booking table", () => {
    const source = readFileSync("src/app/admin/bookings/_components/bookings-client.tsx", "utf8");
    expect(source).not.toContain('w-full text-xs">');
  });
});

// ── Navigation manager ─────────────────────────────────────
describe("RCCF-68.3.5 — navigation manager responsive", () => {
  it("rows wrap on narrow screens (flex-col below sm)", () => {
    const source = readFileSync("src/app/admin/website/navigation/_components/navigation-manager.tsx", "utf8");
    expect(source).toContain("flex flex-col gap-2 rounded-lg border");
    expect(source).toContain("sm:flex-row sm:items-center");
  });

  it("labels and hrefs do not overflow (truncate + min-w-0)", () => {
    const source = readFileSync("src/app/admin/website/navigation/_components/navigation-manager.tsx", "utf8");
    expect(source).toContain("min-w-0 flex-1");
    expect(source).toContain("truncate text-xs text-zinc-600");
  });

  it("controls remain accessible with labels", () => {
    render(
      <NavigationManager
        initialItems={[{ id: "n1", label: "Home", href: "/", type: "page", order: 0, visible: true }] as never}
      />,
    );
    expect(screen.getByRole("button", { name: /move home up/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /move home down/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /hide home/i })).toBeTruthy();
  });

  it("no new navigation authority is introduced", () => {
    const source = readFileSync("src/app/admin/website/navigation/_components/navigation-manager.tsx", "utf8");
    expect(source).not.toContain("filterNavForPlan");
    expect(source).not.toContain("capabilityService");
    expect(source).toContain('from "@/actions/navigation.actions"');
  });
});

// ── Orders ─────────────────────────────────────────────────
describe("RCCF-68.3.5 — orders responsive", () => {
  it("DataTable uses bounded horizontal scrolling (Option B, no page overflow)", () => {
    const source = readFileSync("src/components/data/DataTable.tsx", "utf8");
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("admin-table");
  });

  it("important order fields remain present", () => {
    const source = readFileSync("src/app/admin/orders/_components/orders-table.tsx", "utf8");
    for (const col of ["Product", "Customer", "Amount", "Status", "Date", "Order ID"]) {
      expect(source).toContain(`header: "${col}"`);
    }
  });

  it("customer email wraps safely (break-all)", () => {
    const source = readFileSync("src/app/admin/orders/_components/orders-table.tsx", "utf8");
    expect(source).toContain("break-all");
  });

  it("page uses ContentContainer (bounded width, no page-level overflow)", () => {
    const source = readFileSync("src/app/admin/orders/page.tsx", "utf8");
    expect(source).toContain("<ContentContainer>");
  });
});

// ── Customers ──────────────────────────────────────────────
describe("RCCF-68.3.5 — customers responsive", () => {
  it("responsive customer representation via DataTable", () => {
    const source = readFileSync("src/app/admin/customers/_components/customers-table.tsx", "utf8");
    expect(source).toContain("<DataTable");
  });

  it("long email content wraps safely", () => {
    const source = readFileSync("src/app/admin/customers/_components/customers-table.tsx", "utf8");
    expect(source).toContain("break-all");
  });

  it("customer actions/columns remain present", () => {
    const source = readFileSync("src/app/admin/customers/_components/customers-table.tsx", "utf8");
    for (const col of ["Email", "Total Spent", "Orders", "Last Order"]) {
      expect(source).toContain(`header: "${col}"`);
    }
  });
});

// ── Billing ────────────────────────────────────────────────
describe("RCCF-68.3.5 — billing responsive", () => {
  it("billing tabs scroll horizontally without page overflow", () => {
    const source = readFileSync("src/components/billing/BillingPageClient.tsx", "utf8");
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("whitespace-nowrap");
  });

  it("invoice table is bounded with horizontal scroll", () => {
    const source = readFileSync("src/components/billing/InvoiceCenter.tsx", "utf8");
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("role=\"table\"");
  });

  it("current plan remains visible in subscription manager", () => {
    const source = readFileSync("src/components/billing/SubscriptionManager.tsx", "utf8");
    expect(source).toContain('>Plan</p>');
    expect(source).toContain("currentPlan.name");
  });

  it("usage/storage display remains visible", () => {
    const source = readFileSync("src/components/billing/UsageDashboard.tsx", "utf8");
    expect(source).toContain("Usage & Quotas");
    expect(source).toContain("aria-valuetext");
  });

  it("no duplicated pricing/capability matrix in the billing UI", () => {
    const source = readFileSync("src/components/billing/BillingPageClient.tsx", "utf8");
    // Prices/capabilities come from billingData / availablePlans — never re-declared.
    expect(source).not.toContain("const PRICES");
    expect(source).not.toContain("const CAPABILITIES");
  });
});

// ── Legacy admin-* classes ─────────────────────────────────
describe("RCCF-68.3.5 — legacy presentation cleanup", () => {
  it("milestones remain responsive (grid + stacking forms)", () => {
    const source = readFileSync("src/app/admin/milestones/_components/milestones-manager.tsx", "utf8");
    expect(source).toContain("grid gap-4 sm:grid-cols-2 lg:grid-cols-3");
    expect(source).toContain("grid gap-3 sm:grid-cols-3");
  });

  it("links remain responsive (flex-col sm:flex-row)", () => {
    const source = readFileSync("src/features/links/components/social-links-editor.tsx", "utf8");
    expect(source).toContain("flex flex-col gap-2 rounded-lg border");
    expect(source).toContain("sm:flex-row sm:items-center");
  });

  it("themes remain responsive (responsive grid + wrapping filters)", () => {
    const source = readFileSync("src/app/admin/themes/_components/theme-marketplace-client.tsx", "utf8");
    expect(source).toContain("grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4");
    expect(source).toContain("flex flex-wrap items-center gap-3");
  });

  it("knowledge remains responsive (stacked to 5-col grid)", () => {
    const source = readFileSync("src/modules/knowledge-runtime/presentation/knowledge-dashboard.tsx", "utf8");
    expect(source).toContain("grid grid-cols-1 gap-6 lg:grid-cols-5");
  });

  it("legacy admin-* classes retained only where they are safe theme-token presentation aliases", () => {
    // admin-input / admin-btn-cyan / admin-card are defined in globals.css as
    // theme-token-aware aliases used app-wide; they carry no behavioral meaning,
    // so keeping them is safe (no blind replacement).
    const globals = readFileSync("src/app/globals.css", "utf8");
    expect(globals).toContain(".admin-btn-cyan {");
    expect(globals).toContain(".admin-input {");
  });
});

// ── Architecture preservation ──────────────────────────────
describe("RCCF-68.3.5 — architecture preservation", () => {
  it("no new server action is introduced", () => {
    const files = [
      "src/app/admin/bookings/_components/bookings-client.tsx",
      "src/app/admin/website/navigation/_components/navigation-manager.tsx",
      "src/app/admin/orders/_components/orders-table.tsx",
      "src/app/admin/customers/_components/customers-table.tsx",
      "src/components/layout/PageHeader.tsx",
    ];
    const allowedImports: Record<string, string[]> = {
      "src/app/admin/bookings/_components/bookings-client.tsx": ["@/actions/booking.actions"],
      "src/app/admin/website/navigation/_components/navigation-manager.tsx": ["@/actions/navigation.actions"],
      "src/app/admin/orders/_components/orders-table.tsx": ["@/actions/order.types"],
      "src/app/admin/customers/_components/customers-table.tsx": [],
      "src/components/layout/PageHeader.tsx": [],
    };
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const actions = src.match(/from "@\/actions\/[\w.-]+"/g) ?? [];
      for (const imp of actions) {
        const clean = imp.replace('from "', "").replace('"', "");
        expect(allowedImports[f], `${f} unexpected action ${clean}`).toContain(clean);
      }
    }
  });

  it("no new data source / schema / capability duplication", () => {
    const files = [
      "src/app/admin/bookings/_components/bookings-client.tsx",
      "src/app/admin/website/navigation/_components/navigation-manager.tsx",
    ];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toContain("prisma.");
      expect(src).not.toContain("@/generated/prisma");
      expect(src).not.toContain("capabilityService");
    }
  });

  it("existing tenant authorization is preserved", () => {
    const orders = readFileSync("src/app/admin/orders/page.tsx", "utf8");
    expect(orders).toContain("requireTenant()");
    const customers = readFileSync("src/app/admin/customers/page.tsx", "utf8");
    expect(customers).toContain("requireTenant()");
  });

  it("billing authorization and canonical plan resolution preserved", () => {
    const billing = readFileSync("src/components/billing/BillingPageClient.tsx", "utf8");
    expect(billing).toContain('from "@/actions/billing.actions"');
    expect(billing).toContain("tenantId");
    expect(billing).toContain("workspaceId");
  });

  it("no schema/migration present in this RCCF", () => {
    const files = [
      "src/app/admin/bookings/_components/bookings-client.tsx",
      "src/app/admin/website/navigation/_components/navigation-manager.tsx",
      "src/app/admin/orders/_components/orders-table.tsx",
      "src/app/admin/customers/_components/customers-table.tsx",
    ];
    for (const f of files) {
      expect(readFileSync(f, "utf8")).not.toContain("migration");
    }
  });
});
