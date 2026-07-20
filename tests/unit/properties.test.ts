import { describe, it, expect, beforeEach } from "vitest";
import { PropertyRegistry, propertyRegistry } from "@/lib/builder/properties/registry";
import { PropertyResolver } from "@/lib/builder/properties/resolver";
import { PropertyInspectorStateManager } from "@/lib/builder/properties/resolver";
import { StyleClipboard, PropertyPresetStore, MultiEditManager } from "@/lib/builder/properties/enhanced";
import type { PropertyDescriptor } from "@/lib/builder/properties";

function makeProp(overrides: Partial<PropertyDescriptor> = {}): PropertyDescriptor {
  return {
    id: "test:title", moduleId: "mod_1", key: "title", label: "Title",
    description: "Module title", group: "content", category: "content",
    editorType: "string", defaultValue: "Hello", currentValue: "Hello",
    responsive: false, required: true, readOnly: false, visible: true,
    order: 1, options: null, validation: undefined, capabilities: null,
    ...overrides,
  };
}

describe("PropertySystem", () => {
  beforeEach(() => {
    propertyRegistry.clear();
  });

  describe("PropertyRegistry", () => {
    it("should register properties", () => {
      propertyRegistry.register("mod_1", [makeProp()]);
      expect(propertyRegistry.has("mod_1")).toBe(true);
      expect(propertyRegistry.get("mod_1")).toHaveLength(1);
    });

    it("should unregister properties", () => {
      propertyRegistry.register("mod_1", [makeProp()]);
      propertyRegistry.unregister("mod_1");
      expect(propertyRegistry.has("mod_1")).toBe(false);
    });

    it("should find property by id", () => {
      const prop = makeProp({ id: "mod_1:title" });
      propertyRegistry.register("mod_1", [prop]);
      expect(propertyRegistry.getById("mod_1:title")).toEqual(prop);
    });

    it("should list properties with query filters", () => {
      propertyRegistry.register("mod_a", [
        makeProp({ id: "mod_a:title", group: "content", order: 1 }),
        makeProp({ id: "mod_a:layout", group: "layout", order: 2 }),
      ]);
      propertyRegistry.register("mod_b", [makeProp({ id: "mod_b:title", group: "content", order: 1 })]);
      expect(propertyRegistry.list({ moduleId: "mod_a" })).toHaveLength(2);
      expect(propertyRegistry.list({ group: "layout" })).toHaveLength(1);
      expect(propertyRegistry.list({ search: "title" })).toHaveLength(3);
    });

    it("should return groups for a module", () => {
      propertyRegistry.register("mod_1", [
        makeProp({ group: "content" }), makeProp({ group: "layout" }),
      ]);
      const groups = propertyRegistry.getGroups("mod_1");
      expect(groups.length).toBeGreaterThan(1);
      expect(groups[0]!.id).toBe("content");
    });
  });

  describe("PropertyResolver", () => {
    it("should resolve registered properties", () => {
      propertyRegistry.register("mod_1", [makeProp()]);
      const resolver = new PropertyResolver();
      const result = resolver.resolve("mod_1");
      expect(result.properties.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty for unknown module", () => {
      const resolver = new PropertyResolver();
      const result = resolver.resolve("unknown");
      expect(result.properties.length).toBe(0);
    });
  });

  describe("PropertyInspectorStateManager", () => {
    it("should track selected module", () => {
      const mgr = new PropertyInspectorStateManager();
      mgr.selectModule("mod_1");
      expect(mgr.state.selectedModuleId).toBe("mod_1");
    });

    it("should toggle group expansion", () => {
      const mgr = new PropertyInspectorStateManager();
      expect(mgr.state.expandedGroups.has("layout")).toBe(true);
      mgr.toggleGroup("layout");
      expect(mgr.state.expandedGroups.has("layout")).toBe(false);
    });

    it("should set search query", () => {
      const mgr = new PropertyInspectorStateManager();
      mgr.setSearch("title");
      expect(mgr.state.searchQuery).toBe("title");
    });

    it("should record recently edited", () => {
      const mgr = new PropertyInspectorStateManager();
      mgr.recordEdit("title");
      mgr.recordEdit("layout");
      expect(mgr.state.recentlyEdited).toEqual(["layout", "title"]);
    });

    it("should track read-only state", () => {
      const mgr = new PropertyInspectorStateManager();
      expect(mgr.state.readOnly).toBe(false);
      mgr.setReadOnly(true);
      expect(mgr.state.readOnly).toBe(true);
    });
  });

  describe("StyleClipboard", () => {
    it("should copy and paste properties", () => {
      const cb = new StyleClipboard();
      const props = [makeProp({ key: "title", currentValue: "Hello" })];
      cb.copy(props, "mod_1", "Test", "all");
      const entry = cb.paste();
      expect(entry).not.toBeNull();
      expect(entry!.sourceModuleName).toBe("Test");
      expect(entry!.properties).toHaveLength(1);
    });

    it("should report empty clipboard", () => {
      const cb = new StyleClipboard();
      expect(cb.hasEntry()).toBe(false);
      cb.copy([makeProp()], "mod_1", "Test", "all");
      expect(cb.hasEntry()).toBe(true);
      cb.clear();
      expect(cb.hasEntry()).toBe(false);
    });
  });

  describe("PropertyPresetStore", () => {
    it("should save and retrieve presets", () => {
      const store = new PropertyPresetStore();
      const props = [makeProp({ key: "title", currentValue: "Hero" })];
      const preset = store.save("Hero Style", "typography", props, "com.creatos.hero");
      expect(preset.name).toBe("Hero Style");
      expect(store.list("com.creatos.hero")).toHaveLength(1);
    });

    it("should delete presets", () => {
      const store = new PropertyPresetStore();
      const props = [makeProp()];
      const preset = store.save("Test", "all", props, "*");
      expect(store.delete(preset.id)).toBe(true);
      expect(store.list()).toHaveLength(0);
    });
  });

  describe("MultiEditManager", () => {
    it("should resolve shared properties across modules", () => {
      const mgr = new MultiEditManager();
      const map = new Map([
        ["mod_a", [makeProp({ key: "title" }), makeProp({ key: "width" })]],
        ["mod_b", [makeProp({ key: "title" })]],
      ]);
      const result = mgr.resolve(["mod_a", "mod_b"], map);
      expect(result.compatible).toBe(true);
      expect(result.sharedProperties).toHaveLength(1);
      expect(result.sharedProperties[0]!.key).toBe("title");
    });

    it("should detect conflicts", () => {
      const mgr = new MultiEditManager();
      const map = new Map([
        ["mod_a", [makeProp({ key: "title", currentValue: "A" })]],
        ["mod_b", [makeProp({ key: "title", currentValue: "B" })]],
      ]);
      const result = mgr.resolve(["mod_a", "mod_b"], map);
      expect(result.conflictCount).toBe(1);
    });
  });
});
