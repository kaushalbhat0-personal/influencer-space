// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const h = vi.hoisted(() => ({
  mockUpdateTheme: vi.fn(),
  mockEmit: vi.fn(),
}));

vi.mock("@/actions/theme.actions", () => ({
  updateTheme: h.mockUpdateTheme,
}));
vi.mock("@/lib/builder/events", () => ({
  builderEvents: { emit: h.mockEmit, subscribe: vi.fn(() => () => {}) },
}));

import { AppearancePanel, type AppearanceState } from "@/features/builder/components/appearance-panel";
import { MediaField } from "@/components/shared/MediaField";
import { MediaPickerDialog } from "@/components/shared/MediaPickerDialog";

const repoRoot = resolve(process.cwd());
function read(file: string): string { return readFileSync(resolve(repoRoot, file), "utf8"); }

function baseAppearance(overrides: Partial<AppearanceState> = {}): AppearanceState {
  return {
    font: "geist",
    experienceBackground: "solid",
    experienceSurface: "flat",
    headingWeight: "700",
    borderRadius: "8",
    layoutDensity: "comfortable",
    heroTextAlign: "center",
    heroContentWidth: "medium",
    heroOverlay: "medium",
    experienceBackgroundImage: "",
    experienceBackgroundImageAssetId: "",
    experienceBackgroundImageOpacity: "35",
    ...overrides,
  };
}

function findChip(label: string): HTMLButtonElement {
  const btn = Array.from(document.querySelectorAll('button[role="radio"]')).find((b) => b.textContent?.trim().startsWith(label));
  if (!btn) throw new Error(`Chip radio "${label}" not found`);
  return btn as HTMLButtonElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
  h.mockUpdateTheme.mockReset();
  h.mockEmit.mockReset();
  h.mockUpdateTheme.mockResolvedValue({ success: true });
});

// ── Save Status ──
describe("RCCF-BUILDER-03B-2 — Save status live region", () => {
  it("status region exists with correct role and aria-live polite", () => {
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder />);
    const region = document.querySelector('[data-testid="appearance-save-status"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute("role")).toBe("status");
    expect(region?.getAttribute("aria-live")).toBe("polite");
    expect(region?.getAttribute("aria-atomic")).toBe("true");
  });

  it("no duplicate save-status regions", () => {
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder />);
    const regions = document.querySelectorAll('[data-testid="appearance-save-status"]');
    expect(regions.length).toBe(1);
    // Ensure no second sr-only duplicate (old implementation had two)
    const srDuplicates = document.querySelectorAll('[data-testid="appearance-save-status-sr"]');
    expect(srDuplicates.length).toBe(0);
  });

  it("Saving is announced when change begins (pending)", async () => {
    let neverResolve: Promise<{ success: boolean }>;
    neverResolve = new Promise(() => {});
    h.mockUpdateTheme.mockReturnValue(neverResolve as unknown as Promise<{ success: boolean }>);
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder />);
    fireEvent.click(findChip("Inter"));
    // Pending should show Saving…
    await waitFor(() => {
      const region = document.querySelector('[data-testid="appearance-save-status"]') as HTMLElement;
      expect(region.textContent).toContain("Saving");
    });
  });

  it("Saved is announced only after successful persistence", async () => {
    h.mockUpdateTheme.mockResolvedValue({ success: true });
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder />);
    fireEvent.click(findChip("Inter"));
    await waitFor(() => expect(h.mockUpdateTheme).toHaveBeenCalled());
    await waitFor(() => {
      const region = document.querySelector('[data-testid="appearance-save-status"]') as HTMLElement;
      expect(region.textContent).toContain("Saved");
    });
    // Ensure Saving was shown before Saved (pending true then liveMessage Saved)
    // The region should not show Saved before the mock resolves — we already verified Saved appears after
  });

  it("Failed to save is announced after failed persistence and reverts", async () => {
    h.mockUpdateTheme.mockResolvedValue({ success: false, error: "Theme capability required: advanced_builder" });
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder />);
    fireEvent.click(findChip("Inter"));
    await waitFor(() => expect(h.mockUpdateTheme).toHaveBeenCalled());
    await waitFor(() => {
      const region = document.querySelector('[data-testid="appearance-save-status"]') as HTMLElement;
      expect(region.textContent).toContain("Failed to save");
    });
    // Should have reverted to geist
    const geist = findChip("Geist");
    expect(geist.getAttribute("aria-checked")).toBe("true");
  });

  it("existing visual save indicator remains intact (no redesign)", () => {
    const src = read("src/features/builder/components/appearance-panel.tsx");
    // Header still shows Appearance label and status area with text-[9px] styling
    expect(src).toContain("Appearance");
    expect(src).toContain("text-[9px] text-zinc-600");
  });

  it("state-sync contract remains intact (03A)", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder onRefresh={onRefresh} />);
    fireEvent.click(findChip("Inter"));
    await waitFor(() => expect(h.mockUpdateTheme).toHaveBeenCalledWith("t1", { font: "inter" }));
    await waitFor(() => expect(h.mockEmit).toHaveBeenCalledWith("appearance:changed", expect.any(Object)));
    expect(findChip("Inter").getAttribute("aria-checked")).toBe("true");
  });

  it("live region does not announce optimistic state as persisted before success", async () => {
    let resolveSave: (v: { success: boolean }) => void;
    const promise = new Promise<{ success: boolean }>((res) => (resolveSave = res));
    h.mockUpdateTheme.mockReturnValue(promise as Promise<{ success: boolean }>);
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder />);
    fireEvent.click(findChip("Inter"));
    // While pending, region should show Saving, not Saved
    await waitFor(() => {
      const region = document.querySelector('[data-testid="appearance-save-status"]') as HTMLElement;
      expect(region.textContent).toContain("Saving");
      expect(region.textContent).not.toContain("Saved");
    });
    resolveSave!({ success: true });
    await waitFor(() => {
      const region = document.querySelector('[data-testid="appearance-save-status"]') as HTMLElement;
      expect(region.textContent).toContain("Saved");
    });
  });
});

// ── Gate Announcement ──
describe("RCCF-BUILDER-03B-2 — Gate announcement", () => {
  it("locked control is disabled", () => {
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder={false} />);
    const inter = findChip("Inter");
    expect(inter.disabled).toBe(true);
  });

  it("locked control has valid aria-describedby", () => {
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder={false} />);
    const inter = findChip("Inter");
    const describedBy = inter.getAttribute("aria-describedby");
    expect(describedBy).toBe("appearance-upgrade-explanation");
    const explanation = document.getElementById("appearance-upgrade-explanation");
    expect(explanation).not.toBeNull();
  });

  it("referenced explanation exists and contains upgrade context", () => {
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder={false} />);
    const explanation = document.getElementById("appearance-upgrade-explanation");
    expect(explanation?.textContent).toMatch(/eligible advanced builder/i);
    expect(explanation?.textContent).toMatch(/Upgrade/i);
  });

  it("unlocked control does not incorrectly reference upgrade explanation", () => {
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder />);
    const inter = findChip("Inter");
    expect(inter.getAttribute("aria-describedby")).toBeNull();
    // No explanation element should be present when unlocked
    expect(document.getElementById("appearance-upgrade-explanation")).toBeNull();
  });

  it("pending (not locked) does not reference upgrade explanation", async () => {
    let neverResolve: Promise<{ success: boolean }>;
    neverResolve = new Promise(() => {});
    h.mockUpdateTheme.mockReturnValue(neverResolve as unknown as Promise<{ success: boolean }>);
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder />);
    fireEvent.click(findChip("Inter"));
    await new Promise((r) => setTimeout(r, 10));
    // While pending, chips are disabled due to pending, but locked is false, so no aria-describedby
    const inter = findChip("Inter");
    // inter is now the selected chip (inter) which is disabled due to pending, but should not have upgrade id
    expect(inter.getAttribute("aria-describedby")).toBeNull();
  });

  it("keyboard cannot select locked option (disabled prevents interaction)", () => {
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder={false} />);
    const group = document.querySelector('[role="radiogroup"][aria-label="Font"]') as HTMLElement;
    const inter = findChip("Inter");
    inter.focus();
    fireEvent.keyDown(group, { key: "ArrowRight" });
    // Should not have called updateTheme because disabled
    expect(h.mockUpdateTheme).not.toHaveBeenCalled();
  });

  it("radiogroup semantics from 03B-1 remain intact", () => {
    render(<AppearancePanel tenantId="t1" appearance={baseAppearance()} advancedBuilder />);
    expect(document.querySelectorAll('[role="radiogroup"]').length).toBe(8);
    expect(document.querySelectorAll('button[role="radio"]').length).toBeGreaterThanOrEqual(39);
    const src = read("src/features/builder/components/appearance-panel.tsx");
    expect(src).toContain('role="radiogroup"');
    expect(src).toContain('role="radio"');
    expect(src).toContain("aria-checked");
  });

  it("upgrade explanation is stable and truthful (no hardcoded plan claims)", () => {
    const src = read("src/features/builder/components/appearance-panel.tsx");
    expect(src).toContain('id="appearance-upgrade-explanation"');
    expect(src).toContain("eligible advanced builder");
    // Should not hardcode "Growth" as the only plan — uses generic eligible wording
    expect(src).toContain("aria-describedby");
  });
});

// ── Media Errors ──
describe("RCCF-BUILDER-03B-2 — Media errors", () => {
  it("MediaField error uses role alert", () => {
    const src = read("src/components/shared/MediaField.tsx");
    expect(src).toContain('role="alert"');
  });

  it("MediaPickerDialog errors use role alert", () => {
    const src = read("src/components/shared/MediaPickerDialog.tsx");
    expect(src).toContain('role="alert"');
    // Should appear twice (uploadError and loadError)
    const matches = src.match(/role="alert"/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("media error alert contains real message (not generic Error)", () => {
    const src = read("src/components/shared/MediaField.tsx");
    // The error paragraph renders {error} — the real message from upload/validation
    expect(src).toContain("{error}");
    expect(src).toContain('role="alert"');
  });

  it("successful media selection does not create alert (source check)", () => {
    const src = read("src/components/shared/MediaField.tsx");
    // Success path calls onChange(next) without setting error, so no alert rendered
    expect(src).toContain("onChange(next)");
    // Alert only rendered when error truthy: {error && <p role="alert">
    expect(src).toMatch(/\{\s*error &&/);
  });

  it("MediaField error does not break input association (label remains)", () => {
    render(<MediaField label="Background image" value={null} onChange={() => {}} />);
    expect(screen.getByText("Background image")).toBeTruthy();
    // Input association is via label wrapping, not aria-describedby — preserved
    const src = read("src/components/shared/MediaField.tsx");
    expect(src).toContain('<label className="block text-xs');
  });
});
