import { describe, it, expect } from "vitest";
import { interactionPolicy } from "@/lib/builder/policy";
import { constraintEngine } from "@/lib/builder/constraints";
import { documentValidator } from "@/lib/builder/validation";

describe("PoliciesAndConstraints", () => {
  const ctx = { elementId: "el_1", sectionId: null, pageId: null, role: "ADMIN", plan: "PRO", isLocked: false, isHidden: false, isReadOnly: false, isDraft: false, metadata: {} };

  describe("InteractionPolicy", () => {
    it("should allow select on unlocked element", () => {
      expect(interactionPolicy.canExecute("canSelect", ctx)).toBe(true);
    });

    it("should deny select on locked element", () => {
      expect(interactionPolicy.canExecute("canSelect", { ...ctx, isLocked: true })).toBe(false);
    });

    it("should deny move on read-only canvas", () => {
      expect(interactionPolicy.canExecute("canMove", { ...ctx, isReadOnly: true })).toBe(false);
    });

    it("should deny delete on locked element", () => {
      expect(interactionPolicy.canExecute("canDelete", { ...ctx, isLocked: true })).toBe(false);
    });

    it("should allow publish regardless of plan (entitlement check moved to EntitlementService)", () => {
      expect(interactionPolicy.canExecute("canPublish", { ...ctx, plan: "STARTER" })).toBe(true);
    });

    it("should allow publish for any plan (builder gated at application level)", () => {
      expect(interactionPolicy.canExecute("canPublish", { ...ctx, plan: "PRO" })).toBe(true);
    });
  });

  describe("ConstraintEngine", () => {
    const constraintCtx = {
    elementId: null, moduleId: null, sectionId: null, pageId: null,
    targetSectionId: "s1", targetPageId: null,
    device: "desktop" as const,
    canvas: { pages: [{ sections: [{ id: "s1", name: "Test", order: 0, visible: true, locked: false, slots: Array.from({ length: 20 }, (_, i) => ({ id: `slot_${i}` })), metadata: {} }] }] },
    metadata: {},
  };

  it("should detect max children exceeded", () => {
    const result = constraintEngine.evaluate("max-children", constraintCtx);
    expect(result.valid).toBe(false);
  });

  it("should detect self-parent", () => {
    const result = constraintEngine.evaluate("no-self-parent", { ...constraintCtx, elementId: "s1" });
    expect(result.valid).toBe(false);
  });

  it("should validate layout rules", () => {
    const slots12: { pages: Array<{ sections: Array<{ id: string; name: string; order: number; visible: boolean; locked: boolean; slots: Array<{ id: string }>; metadata: Record<string, unknown> }> }> } = { pages: [{ sections: [{ id: "s1", name: "Test", order: 0, visible: true, locked: false, slots: Array.from({ length: 12 }, (_, i) => ({ id: `slot_${i}` })), metadata: {} }] }] };
    const result = constraintEngine.evaluate("layout-rules", { ...constraintCtx, targetSectionId: "s1", canvas: slots12 as typeof constraintCtx.canvas });
    expect(result.valid).toBe(false);
  });
  });

  describe("DocumentValidator", () => {
    it("should detect missing home page", () => {
      const canvas = { pages: [{ id: "p1", name: "Page", slug: "/", order: 0, isHome: false, sections: [], theme: "", metadata: {} }], activePageId: null, selectedElementIds: new Set(), hoveredElementId: null, focusedElementId: null, zoom: 1, device: "desktop" as const };
      const report = documentValidator.validate(canvas);
      expect(report.valid).toBe(false);
      expect(report.summary.errors).toBeGreaterThan(0);
    });

    it("should pass validation for well-formed canvas", () => {
      const canvas = {
        pages: [{ id: "p1", name: "Home", slug: "/", order: 0, isHome: true, sections: [{ id: "s1", name: "Hero", order: 0, visible: true, locked: false, slots: [{ id: "sl1", moduleId: "com.creatos.hero", parentId: "s1", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} }], theme: "com.creatos.neon-dark", metadata: {} }],
        activePageId: "p1", selectedElementIds: new Set(), hoveredElementId: null, focusedElementId: null, zoom: 1, device: "desktop" as const,
      };
      const report = documentValidator.validate(canvas);
      expect(report.summary.errors).toBe(0);
    });
  });
});
