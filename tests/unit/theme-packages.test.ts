import { describe, it, expect, beforeEach } from "vitest";
import { themePresets } from "@/lib/builder/theme/preset-registry";
import { themePackageValidator } from "@/lib/builder/theme/package-validator";
import type { ThemePackage } from "@/lib/builder/theme/packages";

const samplePackage: ThemePackage = {
  id: "com.creatos.neon-test", name: "Neon Test", version: "1.0.0",
  author: "CreatorOS", description: "Test theme package",
  tags: ["dark", "neon"],
  tokens: {
    id: "neon-test", name: "Neon", version: "1.0.0", description: "Test", author: "CreatorOS",
    groups: [{ id: "colors", label: "Colors", category: "color", tokens: [
      { key: "color.primary", value: "#0FF", category: "color", group: "colors", editable: true, source: "theme" },
    ]}],
    metadata: {},
  },
  compatibility: { minBuilderVersion: "1.0.0" },
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  metadata: {},
};

describe("ThemePackages", () => {
  beforeEach(() => {
    for (const id of themePresets.list().map((e) => e.package.id)) themePresets.uninstall(id);
  });

  describe("ThemePresetRegistry", () => {
    it("should install a package", () => {
      const result = themePresets.install(samplePackage);
      expect(result.success).toBe(true);
      expect(themePresets.size).toBe(1);
    });

    it("should prevent duplicate installs", () => {
      themePresets.install(samplePackage);
      const result = themePresets.install(samplePackage);
      expect(result.success).toBe(false);
    });

    it("should activate a preset", () => {
      themePresets.install(samplePackage);
      expect(themePresets.activate("com.creatos.neon-test")).toBe(true);
      expect(themePresets.getActive()).not.toBeNull();
    });

    it("should search presets", () => {
      themePresets.install(samplePackage);
      expect(themePresets.list({ search: "neon" }).length).toBe(1);
      expect(themePresets.list({ tags: ["dark"] }).length).toBe(1);
      expect(themePresets.list({ tags: ["light"] }).length).toBe(0);
    });
  });

  describe("ThemePackageValidator", () => {
    it("should validate a valid package", () => {
      const result = themePackageValidator.validate(samplePackage);
      expect(result.valid).toBe(true);
    });

    it("should detect missing metadata", () => {
      const pkg = { ...samplePackage, name: "" };
      const result = themePackageValidator.validate(pkg);
      expect(result.valid).toBe(false);
    });

    it("should import and export", () => {
      const json = themePackageValidator.exportToJson(samplePackage);
      const imported = themePackageValidator.importFromJson(json);
      expect(imported).not.toBeNull();
      expect(imported!.id).toBe("com.creatos.neon-test");
    });

    it("should reject invalid JSON", () => {
      const result = themePackageValidator.validateImport("invalid json");
      expect(result.valid).toBe(false);
    });
  });
});
