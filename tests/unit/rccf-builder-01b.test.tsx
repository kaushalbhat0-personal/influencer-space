// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const h = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockIsSelected: vi.fn(),
}));

vi.mock("@/lib/builder/store", () => ({
  builderStore: {
    canvas: {
      pages: [
        {
          id: "p1",
          sections: [
            { id: "s1", name: "Hero", visible: true, slots: [{ id: "slot1", moduleId: "hero.default", config: {} }] },
            { id: "s2", name: "Products", visible: true, slots: [{ id: "slot2", moduleId: "products.grid", config: {} }] },
          ],
        },
      ],
      activePageId: "p1",
    },
    isSelected: (id: string) => h.mockIsSelected(id),
    select: (id: string) => h.mockSelect(id),
    addSection: vi.fn((name: string) => ({ id: "s_new", name, slots: [] })),
    insertComponent: vi.fn(),
    setSectionVisibility: vi.fn(),
    reorderSections: vi.fn(),
  },
}));
vi.mock("@/lib/builder/commands/editor", () => ({
  builderEditor: { deleteSection: vi.fn(), duplicateSection: vi.fn() },
}));
vi.mock("@/lib/registry/components", () => ({
  componentRegistry: { get: vi.fn(() => ({})) },
}));
vi.mock("@/lib/builder/section-counts", () => ({
  sectionCountResolver: { countForModule: vi.fn(() => null) },
}));
vi.mock("@/lib/builder/events", () => ({
  builderEvents: { subscribe: vi.fn(() => () => {}), emit: vi.fn() },
}));

import { CompletionBadge } from "@/features/builder/components/completion-badge";
import { SectionManager } from "@/features/builder/components/section-manager";
import { BuilderMobilePanel } from "@/features/builder/components/mobile-panel";

const repoRoot = resolve(process.cwd());
function read(file: string): string {
  return readFileSync(resolve(repoRoot, file), "utf8");
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  h.mockIsSelected.mockReturnValue(false);
});

// ── 1. Health badge (not builder completion) ──
describe("RCCF-BUILDER-01B — 1. Health badge", () => {
  it("shows skeleton/loading when healthScore is null (no 0% flash)", () => {
    render(<CompletionBadge healthScore={null} isLoading />);
    expect(screen.getByTestId("health-badge-loading")).toBeTruthy();
    expect(screen.queryByText(/% Complete/)).toBeNull();
    expect(screen.queryByText(/Health 0%/)).toBeNull();
  });

  it("auto-loading when healthScore null without explicit isLoading", () => {
    render(<CompletionBadge healthScore={null} />);
    expect(screen.getByTestId("health-badge-loading")).toBeTruthy();
  });

  it("shows Health X% with dashboard label when loaded", () => {
    render(<CompletionBadge healthScore={72} />);
    expect(screen.getByText("Health 72%")).toBeTruthy();
    expect(screen.getByLabelText(/Health 72 percent/)).toBeTruthy();
    expect(screen.queryByText(/Complete/)).toBeNull();
  });

  it("backward compat: pct prop still works but renders Health", () => {
    // pct is legacy completionPct — should still render as Health
    render(<CompletionBadge pct={55} />);
    expect(screen.getByText("Health 55%")).toBeTruthy();
  });

  it("never says Complete", () => {
    const src = read("src/features/builder/components/completion-badge.tsx");
    // No "% Complete" literal should remain in active render path
    const activeLines = src.split("\n").filter((l) => !l.trim().startsWith("//") && l.includes("% Complete"));
    expect(activeLines.length).toBe(0);
    expect(src).toContain("Health");
    expect(src).toContain("healthScore");
    expect(src).not.toMatch(/\{pct\}% Complete/);
  });

  it("workspace renames completionPct→healthScore with null initial (no 0 flash)", () => {
    const src = read("src/features/builder/components/workspace.tsx");
    expect(src).toContain("healthScore");
    expect(src).toContain("useState<number | null>(null)");
    expect(src).not.toMatch(/const \[completionPct, setCompletionPct\] = useState\(0\)/);
    expect(src).toContain("setHealthScore");
    expect(src).toContain("healthScore={healthScore}");
  });

  it("website-panel collapsed shows skeleton when loading", () => {
    const src = read("src/features/builder/components/website-panel.tsx");
    expect(src).toContain("healthScore");
    expect(src).toContain("health-vertical-loading");
    expect(src).toContain("Health");
    // No bare completionPct% in collapsed vertical
    expect(src).not.toMatch(/\bcompletionPct%\b/);
  });

  it("no fabricated builder progress (no setInterval / animate to 100)", () => {
    const ws = read("src/features/builder/components/workspace.tsx");
    const badge = read("src/features/builder/components/completion-badge.tsx");
    expect(ws).not.toMatch(/setInterval[\s\S]*healthScore/);
    expect(badge).not.toMatch(/animateTo100|setTimeout[\s\S]*score\+\+/);
    expect(ws).not.toContain("100% Complete");
  });
});

// ── 2. SectionManager clipping fix (P1-4) ──
describe("RCCF-BUILDER-01B — 2. SectionManager clipping at 200-280px", () => {
  it("card has min-w-0 overflow-hidden and title has tooltip/title", () => {
    const src = read("src/features/builder/components/section-manager.tsx");
    expect(src).toContain("min-w-0 overflow-hidden");
    expect(src).toContain("title={section.name}");
    // secondary actions collapsed into overflow menu
    expect(src).toContain("MoreHorizontal");
    expect(src).toContain("section-${tid}-more");
    expect(src).toContain("role=\"menu\"");
  });

  it("title remains readable with truncate and shrink controls", () => {
    render(<SectionManager />);
    const heroSelect = screen.getByTestId("builder-section-select-hero") as HTMLElement;
    // tooltip
    expect(heroSelect.getAttribute("title")).toBe("Hero");
    // truncate span exists
    expect(heroSelect.textContent).toContain("Hero");
    // more button exists instead of 6 inline buttons
    expect(screen.getByTestId("section-hero-more")).toBeTruthy();
    // primary toggle still present
    expect(screen.getByTestId("section-hero-toggle")).toBeTruthy();
  });

  it("overflow menu collapses secondary actions (duplicate/delete/edit inside menu)", () => {
    render(<SectionManager />);
    // Duplicate/delete should not be direct children before opening menu
    expect(screen.queryByTestId("section-hero-duplicate")).toBeNull();
    expect(screen.queryByTestId("section-hero-delete")).toBeNull();
    // open menu
    fireEvent.click(screen.getByTestId("section-hero-more"));
    expect(screen.getByTestId("section-hero-duplicate")).toBeTruthy();
    expect(screen.getByTestId("section-hero-delete")).toBeTruthy();
    // menu items have menuitem role and 44px targets via min-h-[44px]
    const dup = screen.getByTestId("section-hero-duplicate");
    expect(dup.getAttribute("role")).toBe("menuitem");
    expect(dup.className).toContain("min-h-[44px]");
  });

  it("preserves 44px mobile targets", () => {
    const src = read("src/features/builder/components/section-manager.tsx");
    expect(src).toContain("min-h-[44px]");
    expect(src).toContain("min-w-[44px]");
  });
});

// ── 3. Keyboard-selectable rows (P1-3) ──
describe("RCCF-BUILDER-01B — 3. Keyboard-selectable rows", () => {
  it("select region is a native button with aria-pressed and selects via slot id (keyboard accessible, no nested conflict)", () => {
    h.mockIsSelected.mockReturnValue(false);
    render(<SectionManager />);
    const heroBtn = screen.getByTestId("builder-section-select-hero") as HTMLElement;
    expect(heroBtn.tagName).toBe("BUTTON");
    expect(heroBtn.getAttribute("aria-pressed")).toBe("false");
    expect(heroBtn.getAttribute("aria-label")).toContain("Select Hero section");
    expect(heroBtn.getAttribute("title")).toBe("Hero");
    // Native button: click selects via slot id
    fireEvent.click(heroBtn);
    expect(h.mockSelect).toHaveBeenCalledWith("slot1");
    // Keyboard: Enter and Space on a native button also trigger click (jsdom requires explicit click, but focusable)
    expect(heroBtn.getAttribute("tabIndex")).not.toBe("-1");
  });

  it("no nested button inside button (outer listitem, inner button is the select region)", () => {
    const src = read("src/features/builder/components/section-manager.tsx");
    // outer remains listitem, inner select is <button ... aria-pressed>
    expect(src).toContain('role="listitem"');
    expect(src).toContain('aria-pressed={isSelected}');
    expect(src).toContain('data-testid={`builder-section-select-');
    // ensure no <button> directly wrapping another button's aria-label Move — move buttons are in separate overflow menu div
    // click on overflow menu item stops propagation
    expect(src).toContain("e.stopPropagation()");
    // Title tooltip present for truncated label
    expect(src).toContain("title={section.name}");
  });

  it("actions remain keyboard reachable and do not select via propagation", () => {
    render(<SectionManager />);
    const toggle = screen.getByTestId("section-hero-toggle");
    expect(toggle.tagName).toBe("BUTTON");
    // toggle should not trigger select
    h.mockSelect.mockClear();
    fireEvent.click(toggle);
    // select should not be called for toggle (only for row)
    // toggle calls onToggleVisibility, not select
    expect(h.mockSelect).not.toHaveBeenCalled();
  });
});

// ── 4. Active state slot mapping ──
describe("RCCF-BUILDER-01B — 4. Active state via slot ids", () => {
  it("sidebar active state checks slot ids, not section id", () => {
    const src = read("src/features/builder/components/section-manager.tsx");
    expect(src).toContain("slotIds");
    expect(src).toContain("section.slotIds.some");
    expect(src).toContain("builderStore.isSelected(sid)");
  });

  it("renders selected ring when a slot in the section is selected", () => {
    h.mockIsSelected.mockImplementation((id: string) => id === "slot1");
    render(<SectionManager />);
    const heroRow = screen.getByTestId("builder-section-hero") as HTMLElement;
    expect(heroRow.className).toContain("ring-1");
    const heroBtn = screen.getByTestId("builder-section-select-hero") as HTMLElement;
    expect(heroBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("select calls with slot id, not section id", () => {
    h.mockIsSelected.mockReturnValue(false);
    render(<SectionManager />);
    const heroBtn = screen.getByTestId("builder-section-select-hero");
    fireEvent.click(heroBtn);
    expect(h.mockSelect).toHaveBeenCalledWith("slot1");
    expect(h.mockSelect).not.toHaveBeenCalledWith("s1");
  });
});

// ── 5. BuilderMobilePanel Tab trap ──
describe("RCCF-BUILDER-01B — 5. Mobile sheet Tab trap", () => {
  it("source contains Tab trap with sheetRef and preserves Escape/backdrop/focus return", () => {
    const src = read("src/features/builder/components/mobile-panel.tsx");
    expect(src).toContain('if (e.key === "Tab")');
    expect(src).toContain("sheetRef");
    expect(src).toContain('e.key === "Escape"');
    expect(src).toContain("previouslyFocused");
    expect(src).toContain("aria-modal");
    expect(src).toContain("document.body.style.overflow");
  });

  it("dialog has correct semantics", () => {
    render(
      <BuilderMobilePanel open title="Sections" onClose={() => {}}>
        <button>One</button>
        <button>Two</button>
      </BuilderMobilePanel>,
    );
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Sections");
  });
});

// ── 6. Preview fidelity (P1-1) ──
describe("RCCF-BUILDER-01B — 6. Preview fidelity threads themeConfig", () => {
  it("storefront-loader selects themeConfig and threads it to buildRuntimeSnapshot + experience override", () => {
    const src = read("src/lib/storefront/storefront-loader.ts");
    expect(src).toContain("themeConfig: true");
    expect(src).toContain("applyExperienceOverride");
    expect(src).toContain("(website.themeConfig ?? {})");
    // both snapshot builds include themeConfig
    const themeConfigCalls = (src.match(/themeConfig: \(website\.themeConfig/g) ?? []).length;
    expect(themeConfigCalls).toBeGreaterThanOrEqual(2);
  });

  it("no theme architecture redesign (resolver/layout/build-snapshot unchanged shape)", () => {
    expect(read("src/lib/storefront/build-snapshot.ts")).toContain("themeConfig?: Record<string, string>");
    expect(read("src/lib/storefront/storefront-loader.ts")).not.toContain("RCCF-BUILDER-01B redesign");
  });
});
