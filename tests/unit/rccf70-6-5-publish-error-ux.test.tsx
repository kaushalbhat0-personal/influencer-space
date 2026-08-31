// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";

// RCCF-70.6.5.3 — canonical publishing error UX. One shared pure translator
// (src/lib/publishing/publish-error-messages.ts) consumed by Admin topbar,
// Builder and Dashboard. The server remains the ONLY publish/quota authority:
// no client counting, no hardcoded plan limits, no second authority.

// ── React/jsdom shims ────────────────────────────────────────────────────────
class NoopIO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
class NoopRO {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const h = vi.hoisted(() => ({
  mockPublishWebsite: vi.fn(),
  mockGetPublishStatus: vi.fn(),
  mockRouterRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard",
  useRouter: () => ({ refresh: h.mockRouterRefresh }),
}));

vi.mock("next/link", () => ({
  default: (props: { href: string; children: React.ReactNode; className?: string; "aria-label"?: string; title?: string }) => {
    const { href, children, ...rest } = props;
    return <a href={href} {...rest}>{children}</a>;
  },
}));

vi.mock("@/actions/publish.actions", () => ({
  publishWebsite: h.mockPublishWebsite,
  getPublishStatus: h.mockGetPublishStatus,
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  h.mockPublishWebsite.mockResolvedValue({ success: true });
  h.mockGetPublishStatus.mockResolvedValue({ success: true, status: { state: "live", storefrontUrl: "/testcreator" } });
  (globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
  (globalThis as Record<string, unknown>).ResizeObserver = NoopRO;
});

import { getPublishFailurePresentation } from "@/lib/publishing/publish-error-messages";
import { AdminPublishControl } from "@/app/admin/_components/admin-publish-control";

const quota = (overrides: Record<string, unknown> = {}) => ({
  success: false,
  code: "PUBLISH_QUOTA_EXCEEDED",
  used: 3,
  limit: 3,
  periodEnd: null,
  mode: "lifetime",
  suggestedUpgrade: "growth",
  ...overrides,
});

describe("RCCF-70.6.5.3 — quota presentation", () => {
  it("1. lifetime quota → friendly message with server-provided limit", () => {
    const p = getPublishFailurePresentation(quota());
    expect(p.message).toContain("You've used all 3 publishes available on your current plan.");
    expect(p.message).toContain("Upgrade to keep publishing.");
    expect(p.severity).toBe("warning");
  });

  it("2. monthly quota → friendly billing-period message", () => {
    const p = getPublishFailurePresentation(quota({ mode: "monthly", periodEnd: "2026-08-31T23:59:59.999Z", suggestedUpgrade: "scale" }));
    expect(p.message).toContain("You've reached your publish limit for this billing period.");
    expect(p.message).toContain("allowance resets");
    expect(p.action?.label).toBe("Upgrade to Scale");
  });

  it("3. limit=0 → understandable unavailable message (no 0/0)", () => {
    const p = getPublishFailurePresentation(quota({ used: 0, limit: 0, suggestedUpgrade: null }));
    expect(p.message).toBe("Publishing isn't available on your current plan.");
    expect(p.message).not.toContain("0/0");
    expect(p.action).toBeUndefined();
  });

  it("4. suggestedUpgrade=growth → Upgrade to Growth CTA", () => {
    expect(getPublishFailurePresentation(quota({ suggestedUpgrade: "growth" })).action).toEqual({
      label: "Upgrade to Growth",
      href: "/admin/billing",
    });
  });

  it("5. suggestedUpgrade=scale → Upgrade to Scale CTA", () => {
    expect(getPublishFailurePresentation(quota({ suggestedUpgrade: "scale" })).action?.label).toBe("Upgrade to Scale");
  });

  it("6. suggestedUpgrade=null → no upgrade CTA", () => {
    expect(getPublishFailurePresentation(quota({ suggestedUpgrade: null })).action).toBeUndefined();
  });

  it("7. runtime limit value comes from the result, not hardcoded", () => {
    const p = getPublishFailurePresentation(quota({ used: 7, limit: 7 }));
    expect(p.message).toContain("all 7 publishes");
    const src = readFileSync("src/lib/publishing/publish-error-messages.ts", "utf8");
    expect(src).not.toContain("creator_launch");
    expect(src).not.toContain("limit: 3");
    expect(src).not.toContain("limit: 10");
  });
});

describe("RCCF-70.6.5.3 — trial presentation", () => {
  it("8. PUBLISH_TRIAL_EXPIRED → friendly message", () => {
    const p = getPublishFailurePresentation({ success: false, code: "PUBLISH_TRIAL_EXPIRED", suggestedUpgrade: "growth" });
    expect(p.message).toContain("Your trial has ended.");
    expect(p.message).toContain("website remains live");
    expect(p.message).toContain("requires an active subscription");
    expect(p.severity).toBe("warning");
  });

  it("9. trial suggestedUpgrade → correct upgrade CTA", () => {
    expect(getPublishFailurePresentation({ success: false, code: "PUBLISH_TRIAL_EXPIRED", suggestedUpgrade: "scale" }).action?.label).toBe("Upgrade to Scale");
    expect(getPublishFailurePresentation({ success: false, code: "PUBLISH_TRIAL_EXPIRED", suggestedUpgrade: null }).action).toBeUndefined();
  });
});

describe("RCCF-70.6.5.3 — known product failures", () => {
  it("10. missing homepage → readable original message preserved", () => {
    const p = getPublishFailurePresentation({ success: false, error: "No homepage selected. Mark one page as Home." });
    expect(p.message).toBe("No homepage selected. Mark one page as Home.");
    expect(p.action).toBeUndefined();
  });

  it("11. workspace suspended → readable original message preserved", () => {
    const p = getPublishFailurePresentation({ success: false, error: "Cannot publish: workspace is Suspended" });
    expect(p.message).toBe("Cannot publish: workspace is Suspended");
  });
});

describe("RCCF-70.6.5.3 — technical failure sanitization", () => {
  it("12. Prisma/SQL error → generic publishing failure", () => {
    const p = getPublishFailurePresentation({ success: false, error: "PrismaClientKnownRequestError: Unique constraint failed on the fields: (`tenantId`)" });
    expect(p.message).toBe("Publishing failed. Please try again.");
  });

  it("13. provider/internal error → generic publishing failure", () => {
    expect(getPublishFailurePresentation({ success: false, error: "TypeError: Cannot read properties of undefined (reading 'map')" }).message).toBe("Publishing failed. Please try again.");
    expect(getPublishFailurePresentation({ success: false, error: "Internal server error" }).message).toBe("Publishing failed. Please try again.");
  });

  it("14. stack trace is never rendered", () => {
    const p = getPublishFailurePresentation({ success: false, error: "Error: socket hang up\n    at ClientRequest.<anonymous> (/app/foo.js:12:34)\n    at node:internal/..." });
    expect(p.message).toBe("Publishing failed. Please try again.");
    expect(p.message).not.toMatch(/\bat\s/);
  });
});

describe("RCCF-70.6.5.3 — surfaces use the shared translator", () => {
  it("15. Admin topbar translates a quota failure and shows Upgrade to Growth", async () => {
    h.mockPublishWebsite.mockResolvedValue(quota());
    render(<AdminPublishControl status="draft" size="md" />);
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText(/You've used all 3 publishes available on your current plan/)).toBeTruthy();
    const upgrade = screen.getByRole("link", { name: "Upgrade to Growth" });
    expect(upgrade.getAttribute("href")).toBe("/admin/billing");
    // The publish button is replaced by the next-step CTA.
    expect(screen.queryByRole("button", { name: /publish/i })).toBeNull();
    // No raw server technical string is shown.
    expect(screen.queryByText(/Publish limit reached \(3\/3\)/)).toBeNull();
  });

  it("16. Builder uses the translator for publish failures", () => {
    const src = readFileSync("src/features/builder/components/workspace.tsx", "utf8");
    expect(src).toContain('from "@/lib/publishing/publish-error-messages"');
    expect(src).toContain("const presentation = getPublishFailurePresentation(res)");
    expect(src).toContain("presentation.message");
  });

  it("17. Dashboard uses the translator (local quota copy removed)", () => {
    const src = readFileSync("src/components/dashboard/StorefrontStatusCard.tsx", "utf8");
    expect(src).toContain('from "@/lib/publishing/publish-error-messages"');
    expect(src).toContain("const presentation = getPublishFailurePresentation(res)");
    expect(src).toContain("presentation.message");
    expect(src).not.toContain("buildQuotaMessage");
  });
});

describe("RCCF-70.6.5.3 — security & authority", () => {
  const translatorSrc = readFileSync("src/lib/publishing/publish-error-messages.ts", "utf8");
  const controlSrc = readFileSync("src/app/admin/_components/admin-publish-control.tsx", "utf8");

  it("18. translator performs no server/database access", () => {
    // The classifier legitimately lists technical token words (e.g. "prisma")
    // as match hints, so assert on actual imports/I-O instead of word presence.
    expect(translatorSrc).not.toContain('from "@/lib/prisma"');
    expect(translatorSrc).not.toContain("@/generated/prisma");
    expect(translatorSrc).not.toContain("@/actions/");
    expect(translatorSrc).not.toContain('"use server"');
    expect(translatorSrc).not.toContain("fetch(");
    expect(translatorSrc).not.toContain("next/");
  });

  it("19. no plan limits are hardcoded in translator or control", () => {
    expect(translatorSrc).not.toContain("creator_launch");
    expect(translatorSrc).not.toContain("creator_grow");
    expect(controlSrc).not.toContain("creator_launch");
  });

  it("20. no client-side publish counting", () => {
    expect(translatorSrc).not.toContain("remaining");
    expect(translatorSrc).not.toContain("++");
    expect(controlSrc).not.toContain("remaining");
  });

  it("21. publishWebsite remains the canonical action everywhere", () => {
    expect(controlSrc).toContain('from "@/actions/publish.actions"');
    expect(controlSrc).toContain("const res = await publishWebsite()");
    expect(readFileSync("src/features/builder/components/workspace.tsx", "utf8")).toContain('publishWebsite } from "@/actions/publish.actions"');
    expect(readFileSync("src/components/dashboard/StorefrontStatusCard.tsx", "utf8")).toContain('from "@/actions/publish.actions"');
  });
});

describe("RCCF-70.6.5.4 — publishing upgrade CTA parity", () => {
  const builderSrc = readFileSync("src/features/builder/components/workspace.tsx", "utf8");
  const dashboardSrc = readFileSync("src/components/dashboard/StorefrontStatusCard.tsx", "utf8");
  const translatorSrc = readFileSync("src/lib/publishing/publish-error-messages.ts", "utf8");
  const controlSrc = readFileSync("src/app/admin/_components/admin-publish-control.tsx", "utf8");

  it("1. Builder quota failure → Upgrade to Growth link exists", () => {
    // The shared presentation carries the server-provided tier; the Builder
    // renders that action as a link in its status bar.
    expect(getPublishFailurePresentation(quota({ suggestedUpgrade: "growth" })).action?.label).toBe("Upgrade to Growth");
    expect(builderSrc).toContain("setPublishUpgradeAction(presentation.action ?? null)");
    expect(builderSrc).toContain("publishUpgradeAction && (");
    expect(builderSrc).toContain("href={publishUpgradeAction.href}");
    expect(builderSrc).toContain("{publishUpgradeAction.label}");
  });

  it("2. Builder trial failure → Upgrade link exists", () => {
    expect(getPublishFailurePresentation({ success: false, code: "PUBLISH_TRIAL_EXPIRED", suggestedUpgrade: "growth" }).action).toBeDefined();
    expect(builderSrc).toContain("import Link from \"next/link\"");
    expect(builderSrc).toContain("publishUpgradeAction && (");
  });

  it("3. Dashboard quota failure → Upgrade to Growth link exists", () => {
    expect(getPublishFailurePresentation(quota({ suggestedUpgrade: "growth" })).action?.href).toBe("/admin/billing");
    expect(dashboardSrc).toContain("setUpgradeAction(presentation.action ?? null)");
    expect(dashboardSrc).toContain("upgradeAction && (");
    expect(dashboardSrc).toContain("href={upgradeAction.href}");
    expect(dashboardSrc).toContain("{upgradeAction.label}");
  });

  it("4. Dashboard trial failure → Upgrade link exists", () => {
    expect(getPublishFailurePresentation({ success: false, code: "PUBLISH_TRIAL_EXPIRED", suggestedUpgrade: "growth" }).action).toBeDefined();
    expect(dashboardSrc).toContain("upgradeAction && (");
  });

  it("5. suggestedUpgrade=null → no Upgrade link anywhere", async () => {
    // Pure translator: no action.
    expect(getPublishFailurePresentation(quota({ suggestedUpgrade: null })).action).toBeUndefined();
    // Admin topbar render: message shows, retry button stays, NO upgrade link.
    h.mockPublishWebsite.mockResolvedValue(quota({ suggestedUpgrade: null }));
    render(<AdminPublishControl status="draft" size="md" />);
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText(/You've used all 3 publishes available on your current plan/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /upgrade/i })).toBeNull();
    expect(screen.getByRole("button", { name: /publish/i })).toBeTruthy();
  });

  it("6. Growth → Upgrade to Scale uses the server-provided suggestion", () => {
    // The surfaces never pick a tier themselves; they render whatever the
    // translator derived from suggestedUpgrade.
    expect(getPublishFailurePresentation(quota({ mode: "monthly", suggestedUpgrade: "scale" })).action?.label).toBe("Upgrade to Scale");
    expect(builderSrc).toContain("{publishUpgradeAction.label}");
    expect(dashboardSrc).toContain("{upgradeAction.label}");
  });

  it("7. no plan limits are hardcoded in any surface", () => {
    for (const src of [translatorSrc, controlSrc, builderSrc, dashboardSrc]) {
      expect(src).not.toContain("creator_launch");
      expect(src).not.toContain("creator_grow");
    }
    expect(builderSrc).not.toContain("limit: 3");
    expect(dashboardSrc).not.toContain("limit: 10");
    expect(dashboardSrc).not.toContain("10 publishes per month");
    expect(dashboardSrc).not.toContain("buildQuotaMessage");
  });

  it("8. all three surfaces consume the same translator", () => {
    expect(controlSrc).toContain('from "@/lib/publishing/publish-error-messages"');
    expect(builderSrc).toContain('from "@/lib/publishing/publish-error-messages"');
    expect(dashboardSrc).toContain('from "@/lib/publishing/publish-error-messages"');
    expect(builderSrc).toContain("getPublishFailurePresentation(res)");
    expect(dashboardSrc).toContain("getPublishFailurePresentation(res)");
    expect(controlSrc).toContain("getPublishFailurePresentation");
  });
});