// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";

// RCCF-70.4.5 â€” Creator Builder Premium Creator OS Completion.
// Presentation-only: restyles the existing Builder to the Premium Creator OS
// design language WITHOUT touching the frozen architecture (store, actions,
// persistence, LayoutEngine, renderer, publishing, tenant/capability authority).
//
// Checks 1-5   Builder rendering
// Checks 6-12  Architecture (single source of truth, same runtime, publish path)
// Checks 13-17 Publishing (SAVE != PUBLISH, canonical publishWebsite, 70.6.5 UX)
// Checks 18-21 Hero (no second authority, deep-links to Settings)
// Checks 22-24 Responsive (mobile bar / overlays / desktop rails)
// Checks 25-28 Accessibility (aria-labels, focusable actions, no hover-only)
// Checks 29-31 Truth (no hardcoded plans/limits/fabricated data)
// Checks 32-34 Design system (existing tokens, indigo primary, no new tokens)

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
  mockLoadBuilderPages: vi.fn(),
  mockSaveBuilderPages: vi.fn(),
  mockApplyThemePackage: vi.fn(),
  mockPublishWebsite: vi.fn(),
  mockGetPublishStatus: vi.fn(),
  mockGetBuilderOverview: vi.fn(),
  mockGetWebsiteHealthScore: vi.fn(),
  mockGetLivePreviewData: vi.fn(),
}));

// Server actions â€” resolved to deterministic no-op results so the shell mounts
// without a database. These are the SAME action modules the builder calls.
vi.mock("@/actions/builder.actions", () => ({
  loadBuilderPages: h.mockLoadBuilderPages,
  saveBuilderPages: h.mockSaveBuilderPages,
}));
vi.mock("@/actions/theme.actions", () => ({
  applyThemePackage: h.mockApplyThemePackage,
}));
vi.mock("@/actions/publish.actions", () => ({
  publishWebsite: h.mockPublishWebsite,
  getPublishStatus: h.mockGetPublishStatus,
}));
vi.mock("@/actions/builder-overview.actions", () => ({
  getBuilderOverview: h.mockGetBuilderOverview,
}));
vi.mock("@/actions/health.actions", () => ({
  getWebsiteHealthScore: h.mockGetWebsiteHealthScore,
}));
vi.mock("@/actions/builder-preview.actions", () => ({
  getLivePreviewData: h.mockGetLivePreviewData,
}));

vi.mock("@/lib/supabase", () => ({
  BUCKET: "influencer-images",
  supabaseClient: {},
  supabaseAdmin: {},
}));

// Touched files for source-truth scans (presentation-only restyle).
const TOUCHED = [
  "src/features/builder/components/workspace.tsx",
  "src/features/builder/components/toolbar.tsx",
  "src/features/builder/components/sidebar.tsx",
  "src/features/builder/components/section-manager.tsx",
  "src/features/builder/components/website-panel.tsx",
  "src/features/builder/components/section-presentation-panel.tsx",
  "src/features/builder/components/theme-card.tsx",
  "src/features/builder/components/completion-badge.tsx",
  "src/features/builder/components/mobile-panel.tsx",
  "src/features/builder/components/panel.tsx",
  "src/features/builder/components/loader.tsx",
  "src/features/builder/components/builder-error-boundary.tsx",
  "src/features/builder/components/persistence.ts",
  "src/features/builder/canvas/interactive-canvas.tsx",
  "src/features/builder/canvas/section-actions.tsx",
];

const readAll = () => TOUCHED.map((f) => ({ file: f, source: readFileSync(f, "utf8") }));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  (globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
  (globalThis as Record<string, unknown>).ResizeObserver = NoopRO;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({ matches: false, media: q, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
  (globalThis as Record<string, unknown>).PointerEvent = globalThis.Event;
  if (typeof (globalThis as Record<string, unknown>).HTMLElement !== "undefined") {
    const proto = (globalThis as Record<string, unknown>).HTMLElement.prototype as Record<string, unknown>;
    if (!proto.setPointerCapture) proto.setPointerCapture = function () {};
    if (!proto.releasePointerCapture) proto.releasePointerCapture = function () {};
  }
  h.mockLoadBuilderPages.mockResolvedValue({ success: true, pages: [DEFAULT_PAGE] });
  h.mockSaveBuilderPages.mockResolvedValue({ success: true });
  h.mockApplyThemePackage.mockResolvedValue({ success: true, themeId: "com.creatos.neon-dark" });
  h.mockPublishWebsite.mockResolvedValue({ success: true });
  h.mockGetPublishStatus.mockResolvedValue({ success: true, status: { state: "draft", storefrontUrl: "/testcreator" } });
  h.mockGetBuilderOverview.mockResolvedValue({
    success: true,
    data: {
      tenant: { id: "tenant-1", name: "Test Creator" },
      website: { themePackageId: "com.creatos.neon-dark" },
      blueprint: { name: "Creator" },
      subscription: { code: "creator_launch" },
    },
  });
  h.mockGetWebsiteHealthScore.mockResolvedValue({ success: true, score: 62 });
  h.mockGetLivePreviewData.mockResolvedValue({ success: false });
});

import { BuilderWorkspace } from "@/features/builder/components/workspace";
import { builderStore } from "@/lib/builder/store";

// A realistic default draft: one Home page with a registered Hero section.
// Every mount hydrates with this page, which resets the store singleton
// (isDirty=false, selection cleared) so tests never leak state across runs.
const DEFAULT_PAGE = {
  id: "page_default",
  name: "Home",
  slug: "/",
  order: 0,
  isHome: true,
  theme: "default",
  metadata: {},
  sections: [
    {
      id: "sec_hero_default",
      name: "Hero",
      order: 0,
      visible: true,
      locked: false,
      metadata: {},
      slots: [
        { id: "slot_hero_default", moduleId: "hero.default", parentId: "sec_hero_default", order: 0, visible: true, locked: false, config: {}, metadata: {} },
      ],
    },
  ],
};

async function mountBuilder() {
  const utils = render(<BuilderWorkspace />);
  await waitFor(() => expect(screen.queryByText("Loading your editorâ€¦")).toBeNull());
  return utils;
}

/** Selects the existing Hero section's slot in the store (no mutation, no dirt). */
function selectHero() {
  const page = builderStore.canvas.pages[0];
  const slotId = page.sections[0].slots[0].id;
  builderStore.select(slotId);
  return { section: page.sections[0], slotId };
}

describe("RCCF-70.4.5 â€” Builder rendering (1-5)", () => {
  it("1. renders the Premium Creator OS toolbar (brand, back link, undo/redo)", async () => {
    await mountBuilder();
    expect(screen.getByRole("link", { name: "Back to Dashboard" })).toBeTruthy();
    expect(screen.getByText("CreatorStore")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Redo" })).toBeTruthy();
  });

  it("2. renders the canvas device frame with browser chrome + dimension label", async () => {
    const { container } = await mountBuilder();
    expect(container.querySelector('[data-testid="builder-canvas"]')).toBeTruthy();
    // The device frame carries the desktop width label in its browser chrome.
    expect(screen.getByText("1200px")).toBeTruthy();
  });

  it("3. renders the left Sections rail with the add-section catalog", async () => {
    await mountBuilder();
    expect(screen.getAllByText("Sections").length).toBeGreaterThanOrEqual(1);
    // The catalog is real: every entry maps to a REGISTERED component.
    expect(screen.getByTestId("add-section-hero")).toBeTruthy();
    expect(screen.getByTestId("add-section-products")).toBeTruthy();
    expect(screen.getByTestId("add-section-footer")).toBeTruthy();
  });

  it("4. renders the right Properties rail (Website / Theme / Progress groups)", async () => {
    await mountBuilder();
    expect(screen.getByText("Website")).toBeTruthy();
    expect(screen.getByText("Theme")).toBeTruthy();
    expect(screen.getByText("Progress")).toBeTruthy();
  });

  it("5. renders the status bar (Save, Publish, draft state)", async () => {
    await mountBuilder();
    expect(screen.getByTestId("builder-publish")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /save/i }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Draft saved")).toBeTruthy();
  });
});

describe("RCCF-70.4.5 â€” Architecture (6-12)", () => {
  it("6. single source of truth: the whole surface reads the one builderStore module", async () => {
    const files = readAll();
    for (const { file, source } of files) {
      if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        const storeImports = source.match(/from\s+"@\/lib\/builder\/store"/g) ?? [];
        if (storeImports.length > 0) {
          expect(storeImports.length).toBeLessThanOrEqual(1);
        }
      }
    }
    const canvas = readAll().find((f) => f.file.includes("interactive-canvas"))!.source;
    expect(canvas).toContain('from "@/lib/builder/store"');
    expect(canvas).toContain('builderEvents.subscribe("store:changed"');
  });

  it("7. same runtime renderer: preview renders through ComponentRenderer (previewMode), no builder-only renderer", async () => {
    const canvas = readAll().find((f) => f.file.includes("interactive-canvas"))!.source;
    expect(canvas).toContain('from "@/lib/renderer"');
    expect(canvas).toContain("ComponentRenderer");
    expect(canvas).toContain("previewMode");
    expect(canvas).toContain('from "@/lib/storefront/layout-engine"');
    // No builder-specific renderer/resolver was introduced.
    expect(canvas).not.toMatch(/from\s+"@\/lib\/builder\/renderer/);
  });

  it("8. no duplicate publish path: publishWebsite is imported only from the publish actions module", async () => {
    const files = readAll();
    for (const { source } of files) {
      const imports = source.match(/import\s*\{[^}]*publishWebsite[^}]*\}\s*from\s+"([^"]+)"/g) ?? [];
      for (const imp of imports) {
        expect(imp).toContain("@/actions/publish.actions");
      }
    }
  });

  it("9. canvas selection reflects the same store (isSelected), single selection state", async () => {
    const canvas = readAll().find((f) => f.file.includes("interactive-canvas"))!.source;
    expect(canvas).toContain("builderStore.isSelected(slotId)");
    await mountBuilder();
    const { slotId } = selectHero();
    expect(builderStore.isSelected(slotId)).toBe(true);
  });

  it("10. no client tenant/capability/billing authority in the Builder surface", async () => {
    const files = readAll();
    for (const { source } of files) {
      expect(source).not.toMatch(/from\s+"@\/lib\/capabilities"/);
      expect(source).not.toMatch(/from\s+"@\/lib\/billing"/);
      expect(source).not.toMatch(/from\s+"@\/modules\/billing"/);
      expect(source).not.toMatch(/from\s+"@\/lib\/tenant"/);
      expect(source).not.toMatch(/getTenantId\(/);
    }
  });

  it("11. SAVE and PUBLISH are distinct: saveBuilderPages vs publishWebsite, separate handlers", async () => {
    const ws = readAll().find((f) => f.file.includes("workspace.tsx"))!.source;
    expect(ws).toContain("saveBuilderPages(pages)");
    expect(ws).toContain("publishWebsite()");
    // publishWebsite appears only AFTER handlePublish is declared (the publish
    // path) — never in the save path (performSave).
    const beforePublish = ws.slice(0, ws.indexOf("const handlePublish"));
    const afterPublish = ws.slice(ws.indexOf("const handlePublish"));
    expect(afterPublish).toContain("publishWebsite()");
    expect(beforePublish).not.toContain("publishWebsite()");
    await mountBuilder();
    expect(screen.getByTestId("builder-publish")).toBeTruthy();
  });

  it("12. no new server action is imported by the touched Builder files", async () => {
    const allowed = [
      "@/actions/builder.actions",
      "@/actions/theme.actions",
      "@/actions/publish.actions",
      "@/actions/builder-overview.actions",
      "@/actions/health.actions",
      "@/actions/builder-preview.actions",
    ];
    for (const { file, source } of readAll()) {
      const actionImports = source.match(/from\s+"@\/actions\/[\w.-]+"/g) ?? [];
      for (const imp of actionImports) {
        const clean = imp.replace('from "', "").replace('"', "");
        expect(allowed, `${file} imports unexpected action ${clean}`).toContain(clean);
      }
    }
  });
});

describe("RCCF-70.4.5 â€” Publishing (13-17)", () => {
  it("13. the Publish control is present", async () => {
    await mountBuilder();
    expect(screen.getByTestId("builder-publish")).toBeTruthy();
    expect(screen.getByText("Publish")).toBeTruthy();
  });

  it("14. publish status + draft state are surfaced (RCCF-70.6.5 state preserved)", async () => {
    await mountBuilder();
    expect(screen.getByText("Draft saved")).toBeTruthy();
    expect(screen.getByText(/v\d+/)).toBeTruthy();
  });

  it("15. upgrade/trial messaging (publishUpgradeAction) is preserved and links to the canonical billing route", async () => {
    const ws = readAll().find((f) => f.file.includes("workspace.tsx"))!.source;
    expect(ws).toContain("publishUpgradeAction");
    expect(ws).toContain("href={publishUpgradeAction.href}");
    expect(ws).toContain('from "@/lib/publishing/publish-error-messages"');
    const msgs = readFileSync("src/lib/publishing/publish-error-messages.ts", "utf8");
    expect(msgs).toContain("/admin/billing");
  });

  it("16. publishing still uses the existing publishWebsite server action", async () => {
    await mountBuilder();
    fireEvent.click(screen.getByTestId("builder-publish"));
    await waitFor(() => expect(h.mockPublishWebsite).toHaveBeenCalled());
  });

  it("17. the Save path never calls publishWebsite", async () => {
    await mountBuilder();
    fireEvent.click(screen.getAllByRole("button", { name: /^save$/i })[0]);
    await waitFor(() => expect(h.mockSaveBuilderPages).toHaveBeenCalled());
    expect(h.mockPublishWebsite).not.toHaveBeenCalled();
  });
});

describe("RCCF-70.4.5 â€” Hero (18-21)", () => {
  it("18. Hero renders through the canonical pipeline (ComponentRenderer + previewMode), no builder-only Hero renderer", async () => {
    const canvas = readAll().find((f) => f.file.includes("interactive-canvas"))!.source;
    expect(canvas).toContain("<ComponentRenderer");
    expect(canvas).toContain("previewMode");
    // The Builder does not resolve Hero media itself â€” that is the media service's job.
    expect(canvas).not.toContain("resolveHeroMediaForRuntime");
    expect(canvas).not.toContain("HeroRenderer");
  });

  it("19. no Hero editing authority lives in the Builder surface (no hero server actions / settings-form)", async () => {
    for (const { source } of readAll()) {
      expect(source).not.toMatch(/updateHeroData|updateHeroPartial|getHeroData|SettingsService|settings-form/);
    }
  });

  it("20. sidebar Hero deep-links to Settings (/admin/settings) â€” one Hero edit authority", async () => {
    const sm = readAll().find((f) => f.file.includes("section-manager"))!.source;
    expect(sm).toContain('"hero.default": "/admin/settings"');
    await mountBuilder();
    selectHero();
    const card = screen.getByTestId("builder-section-hero");
    const editLink = within(card).getByRole("link");
    expect(editLink.getAttribute("href")).toBe("/admin/settings");
  });

  it("21. the Hero content flows from Settings, not from a second Builder source of truth", async () => {
    // The Builder only ever renders presentation; content keys are rejected by
    // the store's config updater (content lives in the live CMS).
    const store = readAll().find((f) => f.file.includes("store.ts")) as { file: string; source: string } | undefined;
    if (store) {
      expect(store.source).toContain("Content keys are rejected");
    }
    for (const { source } of readAll()) {
      expect(source).not.toContain("heroImage");
    }
  });
});

describe("RCCF-70.4.5 â€” Responsive (22-24)", () => {
  it("22. mobile bottom control bar renders (Sections / Canvas / Properties)", async () => {
    const { container } = await mountBuilder();
    expect(container.querySelector('[data-testid="builder-mobile-bar"]')).toBeTruthy();
    expect(screen.getByTestId("mobile-bar-sections")).toBeTruthy();
    expect(screen.getByTestId("mobile-bar-canvas")).toBeTruthy();
    expect(screen.getByTestId("mobile-bar-properties")).toBeTruthy();
  });

  it("23. mobile panels open as dialogs", async () => {
    await mountBuilder();
    fireEvent.click(screen.getByTestId("mobile-bar-sections"));
    const panel = screen.getByTestId("builder-mobile-panel");
    expect(within(panel).getByRole("dialog", { name: "Sections" })).toBeTruthy();
  });

  it("24. desktop rails are hidden below lg (hidden lg:block), never stealing canvas width", async () => {
    const { container } = await mountBuilder();
    const rails = Array.from(container.querySelectorAll('[role="separator"]')).map((s) => s.closest(".relative"));
    for (const rail of rails) {
      expect(rail?.className).toContain("hidden");
      expect(rail?.className).toContain("lg:block");
    }
  });
});

describe("RCCF-70.4.5 â€” Accessibility (25-28)", () => {
  it("25. icon-only section row actions carry aria-labels", async () => {
    await mountBuilder();
    selectHero();
    expect(screen.getByRole("button", { name: /move hero up/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /move hero down/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /hide hero/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /duplicate hero/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /delete hero/i })).toBeTruthy();
  });

  it("26. canvas device switch buttons have accessible names", async () => {
    await mountBuilder();
    for (const label of ["mobile preview", "tablet preview", "desktop preview"]) {
      expect(screen.getByRole("button", { name: new RegExp(label, "i") })).toBeTruthy();
    }
  });

  it("27. panel toggles expose aria-expanded and a clear label", async () => {
    await mountBuilder();
    const left = screen.getByTestId("panel-toggle-left");
    expect(left.getAttribute("aria-expanded")).toBe("true");
    expect(left.getAttribute("aria-label")).toMatch(/collapse sections panel/i);
    const right = screen.getByTestId("panel-toggle-right");
    expect(right.getAttribute("aria-expanded")).toBe("true");
    expect(right.getAttribute("aria-label")).toMatch(/collapse properties panel/i);
  });

  it("28. section row actions are not hover-only (visible below lg, focus-reachable on desktop)", async () => {
    const sm = readAll().find((f) => f.file.includes("section-manager"))!.source;
    expect(sm).toContain("lg:opacity-0");
    expect(sm).toContain("lg:group-hover:opacity-100");
    expect(sm).toContain("lg:group-focus-within:opacity-100");
    // Canvas quick actions expose accessible names too.
    const sa = readAll().find((f) => f.file.includes("section-actions"))!.source;
    expect(sa).toContain('aria-label={`Duplicate');
    expect(sa).toContain('aria-label={`Delete');
  });
});

describe("RCCF-70.4.5 â€” Truth (29-31)", () => {
  it("29. no hardcoded plan codes in the Builder surface", async () => {
    for (const { file, source } of readAll()) {
      expect(source, `${file} contains creator_launch`).not.toContain("creator_launch");
      expect(source, `${file} contains creator_grow`).not.toContain("creator_grow");
      expect(source, `${file} contains creator_scale`).not.toContain("creator_scale");
    }
  });

  it("30. no hardcoded plan limits in the Builder surface", async () => {
    for (const { file, source } of readAll()) {
      expect(source, `${file} contains 'limit: 3'`).not.toContain("limit: 3");
      expect(source, `${file} contains 'limit: 10'`).not.toContain("limit: 10");
    }
  });

  it("31. no fabricated analytics/revenue/orders data in the Builder surface", async () => {
    for (const { file, source } of readAll()) {
      expect(source, `${file} contains fabricated revenue`).not.toMatch(/fakeRevenue|mockRevenue|demoRevenue|placeholderRevenue|fakeOrders|mockOrders/);
      expect(source, `${file} contains fabricated analytics`).not.toMatch(/fakeAnalytics|mockAnalytics|demoAnalytics/);
    }
  });
});

describe("RCCF-70.4.5 â€” Design system (32-34)", () => {
  it("32. restyle reuses existing token classes (admin-input / admin-select) + the brand gradient", async () => {
    const combined = readAll().map((f) => f.source).join("\n");
    expect(combined).toContain("admin-input");
    expect(combined).toContain("admin-select");
    // Premium Creator OS brand identity: indigo â†’ violet gradient (toolbar brand).
    expect(combined).toContain("from-indigo-400");
    expect(combined).toContain("to-violet-400");
  });

  it("33. indigo primary replaces the legacy s8ul accents consistently (no s8ul-* left)", async () => {
    const combined = readAll().map((f) => f.source).join("\n");
    expect(combined).toContain("indigo-");
    expect(combined).not.toContain("s8ul-cyan");
    expect(combined).not.toContain("s8ul-purple");
  });

  it("34. no new fonts / arbitrary radius / arbitrary spacing introduced by the restyle", async () => {
    for (const { file, source } of readAll()) {
      expect(source, `${file} has inline font-family`).not.toMatch(/font-family\s*:/);
      expect(source, `${file} has arbitrary radius`).not.toMatch(/rounded-\[/);
      expect(source, `${file} has arbitrary font`).not.toMatch(/font-\[/);
      expect(source, `${file} has arbitrary shadow`).not.toMatch(/shadow-\[/);
    }
  });
});
