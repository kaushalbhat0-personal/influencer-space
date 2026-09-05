// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { readFileSync, existsSync } from "node:fs";
import type { DashboardData } from "@/features/dashboard/actions";
import { DashboardPage } from "@/features/dashboard/components/dashboard-page";

// RCCF-70.4.3 — Creator Dashboard Premium Creator OS implementation.
// Presentation-only structural/behavioral assertions on the dashboard page:
//   - Stitch-style hierarchy (Storefront → Quick Actions → metrics → content)
//   - real server-derived metrics only (no fabricated analytics)
//   - publishing surface stays canonical (StorefrontStatusCard wired)
//   - quick actions point to existing routes only
//   - responsive foundation + token classes preserved
// No frozen architecture is touched; nothing here asserts new backend behavior.

// ── shims ───────────────────────────────────────────────────────────────────
class NoopIO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
class NoopRO { observe() {} unobserve() {} disconnect() {} }

const h = vi.hoisted(() => ({
  mockPublishWebsite: vi.fn(),
  mockRollbackWebsite: vi.fn(),
  mockGetCreatorPublishUsage: vi.fn(),
  mockRouterRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard",
  useRouter: () => ({ refresh: h.mockRouterRefresh }),
}));

vi.mock("next/link", () => ({
  default: (props: { href: string; children: React.ReactNode; className?: string }) => {
    const { href, children, ...rest } = props;
    return <a href={href} {...rest}>{children}</a>;
  },
}));

vi.mock("@/actions/publish.actions", () => ({
  publishWebsite: h.mockPublishWebsite,
  rollbackWebsite: h.mockRollbackWebsite,
  getCreatorPublishUsage: h.mockGetCreatorPublishUsage,
}));

// Sub-card modules are data-backed (actions/runtime); stub them so the render
// test isolates the dashboard shell + metrics without a DB. Wiring is verified
// separately via source-truth assertions below.
vi.mock("@/modules/business-health/presentation/business-health-hero", () => ({
  BusinessHealthHero: () => <div data-testid="business-health-hero" />,
}));
vi.mock("@/modules/customer-success/presentation/success-journey-card", () => ({
  SuccessJourneyCard: () => <div data-testid="success-journey" />,
}));
vi.mock("@/modules/knowledge-runtime/presentation/knowledge-score-card", () => ({
  KnowledgeScoreCard: () => <div data-testid="knowledge-score" />,
}));
vi.mock("@/modules/goals-runtime/presentation/goal-dashboard-card", () => ({
  GoalDashboardCard: () => <div data-testid="goal-dashboard" />,
}));
vi.mock("@/modules/recommendation-runtime/presentation/next-best-step-card", () => ({
  NextBestStepCard: () => <div data-testid="next-best-step" />,
}));
vi.mock("@/modules/website-evolution/presentation/evolution-feed-card", () => ({
  EvolutionFeedCard: () => <div data-testid="evolution-feed" />,
}));
vi.mock("@/components/dashboard/SuccessMilestonesCard", () => ({
  SuccessMilestonesCard: () => <div data-testid="success-milestones" />,
}));
vi.mock("@/components/dashboard/OnboardingChecklist", () => ({
  OnboardingChecklist: () => <div data-testid="onboarding-checklist" />,
}));
vi.mock("@/features/_shared/components/feature-page", () => ({
  FeaturePage: ({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) => (
    <div data-testid="feature-page">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {actions}
      {children}
    </div>
  ),
  FeatureEmptyState: () => null,
}));

const baseMetrics = {
  productCount: 2,
  activeProductCount: 1,
  publishedProductCount: 1,
  orderCount: 3,
  revenue: 1250,
  galleryCount: 4,
  linkCount: 2,
  messageCount: 1,
  bookingCount: 1,
  offeringCount: 1,
  totalOrders: 3,
  publishedVersion: 1,
  publishedAt: "2026-08-01T10:00:00.000Z",
  generationStatus: null,
  publishState: "live",
  storefrontUrl: "/testcreator",
  hasPublishedSnapshot: true,
  hasCustomDomain: false,
  hasSeo: true,
  profileCompletion: 80,
  testimonialCount: 1,
  currentTheme: "Premium",
  recentVersions: [],
};

function makeData(overrides: Record<string, unknown> = {}): DashboardData {
  return {
    metrics: baseMetrics,
    activity: [],
    health: [],
    overallScore: 92,
    knowledge: { overall: 80, confidence: 0.8, categories: [], missing: [], storefrontOverall: 85 },
    goals: { profile: null, dashboard: null, alignment: 0 },
    success: null,
    recommendations: { top: null, total: 0 },
    businessHealth: null,
    evolution: { opportunities: [] },
    steps: [],
    creatorName: "Test Creator",
    ...overrides,
  } as unknown as DashboardData;
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  (globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
  (globalThis as Record<string, unknown>).ResizeObserver = NoopRO;
  h.mockGetCreatorPublishUsage.mockResolvedValue({ success: true, usage: null });
});

const DASHBOARD_SRC = "src/features/dashboard/components/dashboard-page.tsx";

// ── Render: hierarchy & metrics ─────────────────────────────────────────────
describe("RCCF-70.4.3 — dashboard hierarchy (render)", () => {
  it("renders the welcome message with the creator name", () => {
    render(<DashboardPage initialData={makeData()} />);
    expect(screen.getByText(/Welcome back, Test Creator/)).toBeTruthy();
  });

  it("renders Stitch-style section labels: Storefront then Quick Actions", () => {
    render(<DashboardPage initialData={makeData()} />);
    // The "Storefront" section label (h2) + the card's internal heading both exist.
    const sectionLabel = screen.getAllByText("Storefront").find((el) => el.tagName === "H2");
    expect(sectionLabel).toBeTruthy();
    expect(screen.getByText("Quick Actions")).toBeTruthy();
  });

  it("keeps the canonical StorefrontStatusCard wired into the Storefront section", () => {
    render(<DashboardPage initialData={makeData()} />);
    const src = readFileSync(DASHBOARD_SRC, "utf8");
    expect(src).toContain("<StorefrontStatusCard");
    expect(src).toContain('publishState={metrics.publishState}');
    expect(src).toContain('recentVersions={metrics.recentVersions}');
    expect(src).toContain("hasProducts={metrics.publishedProductCount > 0}");
  });

  it("renders real server-derived metric values (no fabricated analytics)", () => {
    render(<DashboardPage initialData={makeData()} />);
    // "Products" appears in both the Quick Actions tile and the metric card.
    expect(screen.getAllByText("Products").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Orders").length).toBeGreaterThanOrEqual(2);
    // productCount 2 and orderCount 3 come from the passed-in data, never a constant.
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    // 3 orders @ INR 1250 → ₹1,250 revenue formatted from real values.
    expect(screen.getByText("₹1,250 revenue")).toBeTruthy();
  });

  it("renders an empty-store setup banner when there are no products/bookings/orders", () => {
    const empty = makeData({
      metrics: { ...baseMetrics, productCount: 0, bookingCount: 0, orderCount: 0, revenue: 0, totalOrders: 0, activeProductCount: 0 },
    });
    render(<DashboardPage initialData={empty} />);
    expect(screen.getByText(/Let's set up your store/)).toBeTruthy();
    expect(screen.queryByText(/revenue/)).toBeNull();
  });

  it("renders quick action links for every surface", () => {
    const { container } = render(<DashboardPage initialData={makeData()} />);
    const hrefs = Array.from(container.querySelectorAll("a[href]")).map((a) => a.getAttribute("href"));
    for (const href of ["/admin/products", "/admin/bookings", "/admin/services", "/admin/courses", "/admin/orders", "/admin/appearance", "/admin/billing"]) {
      expect(hrefs).toContain(href);
    }
  });

  it("renders Website Health with the real overall score", () => {
    render(<DashboardPage initialData={makeData({ overallScore: 92 })} />);
    expect(screen.getByText("Website Health")).toBeTruthy();
    expect(screen.getByText("92%")).toBeTruthy();
  });
});

// ── Source truth: no fabricated data ────────────────────────────────────────
describe("RCCF-70.4.3 — source truth (no fabricated data)", () => {
  it("contains no Stitch placeholder/fabricated analytics strings", () => {
    const src = readFileSync(DASHBOARD_SRC, "utf8");
    for (const banned of ["$42,920.50", "42,920", "1,284", "9021", "4.1TB", "5TB", "Total Orders", "Revenue $"]) {
      expect(src).not.toContain(banned);
    }
  });

  it("quick action hrefs point to existing admin routes only", () => {
    const src = readFileSync(DASHBOARD_SRC, "utf8");
    const hrefs = Array.from(src.matchAll(/href: "(\/admin\/[a-z-]+)"/g), (m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const routeDir = `src/app${href}`;
      expect(existsSync(routeDir), `quick action route ${href} missing`).toBe(true);
    }
  });
});

// ── Source truth: architecture preserved ────────────────────────────────────
describe("RCCF-70.4.3 — source truth (architecture)", () => {
  it("introduces no server action and touches no data layer", () => {
    const src = readFileSync(DASHBOARD_SRC, "utf8");
    expect(src).not.toContain('from "@/actions/');
    expect(src).not.toContain("@/generated/prisma");
    expect(src).not.toContain('"use server"');
    expect(src).not.toContain("prisma.");
  });

  it("does not duplicate capability/billing logic", () => {
    const src = readFileSync(DASHBOARD_SRC, "utf8");
    for (const banned of ["filterNavForPlan", "capabilityService", "creator_launch", "planCode", "resolveActivePlan"]) {
      expect(src).not.toContain(banned);
    }
  });

  it("reuses the shared MetricCard primitive (no local duplicate)", () => {
    const src = readFileSync(DASHBOARD_SRC, "utf8");
    expect(src).toContain('MetricCard } from "@/components/data/MetricCard"');
    expect(src).not.toContain("function MetricCard(");
  });

  it("preserves the responsive quick-card grid foundation", () => {
    const src = readFileSync(DASHBOARD_SRC, "utf8");
    expect(src).toContain("grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12");
    expect(src).toContain("<MetricGrid>");
    expect(src).toContain("DashboardGrid");
  });

  it("keeps every pre-existing widget wired (no functionality removed)", () => {
    const src = readFileSync(DASHBOARD_SRC, "utf8");
    for (const imp of [
      "BusinessHealthHero",
      "SuccessJourneyCard",
      "OnboardingChecklist",
      "NextBestStepCard",
      "EvolutionFeedCard",
      "KnowledgeScoreCard",
      "GoalDashboardCard",
      "SuccessMilestonesCard",
      "StorefrontStatusCard",
    ]) {
      expect(src, `missing widget ${imp}`).toContain(imp);
    }
    // All are still rendered (JSX), not just imported.
    for (const use of ["<BusinessHealthHero", "<SuccessJourneyCard", "<OnboardingChecklist", "<NextBestStepCard", "<EvolutionFeedCard", "<KnowledgeScoreCard", "<GoalDashboardCard", "<SuccessMilestonesCard", "<StorefrontStatusCard"]) {
      expect(src, `widget not rendered: ${use}`).toContain(use);
    }
  });

  it("uses canonical token classes for primary actions", () => {
    const src = readFileSync(DASHBOARD_SRC, "utf8");
    expect(src).toContain('className="btn-primary');
    expect(src).toContain("rounded-xl bg-white/[0.03] border border-white/5");
  });
});