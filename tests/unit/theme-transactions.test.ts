import { describe, it, expect, beforeEach } from "vitest";
import { themeRegistry } from "@/lib/builder/theme/registry";
import { themeTransaction } from "@/lib/builder/theme/transaction";
import type { ThemeDefinition } from "@/lib/builder/theme/types";

const sampleTheme: ThemeDefinition = {
  id: "tx-test", name: "TX Test", version: "1.0.0",
  description: "", author: "",
  groups: [
    { id: "colors", label: "Colors", category: "color", tokens: [
      { key: "color.primary", value: "#2563EB", category: "color", group: "colors", editable: true, source: "theme" },
      { key: "color.secondary", value: "#7C3AED", category: "color", group: "colors", editable: true, source: "theme" },
    ]},
  ],
  metadata: {},
};

describe("ThemeTransactions", () => {
  beforeEach(() => {
    themeRegistry.load(sampleTheme);
    themeTransaction.reset();
  });

  it("should begin a transaction", () => {
    themeTransaction.begin();
    expect(themeTransaction.isActive()).toBe(true);
  });

  it("should track changes", () => {
    themeTransaction.begin();
    themeRegistry.setTokenValue("color.primary", "#FF0000");
    expect(themeTransaction.state.affectedCount).toBe(1);
  });

  it("should rollback changes", () => {
    themeTransaction.begin();
    themeRegistry.setTokenValue("color.primary", "#FF0000");
    expect(themeRegistry.getToken("color.primary")!.value).toBe("#FF0000");
    const result = themeTransaction.rollback();
    expect(result.success).toBe(true);
    expect(themeRegistry.getToken("color.primary")!.value).toBe("#2563EB");
    expect(themeTransaction.isActive()).toBe(false);
  });

  it("should commit changes", () => {
    themeTransaction.begin();
    themeRegistry.setTokenValue("color.primary", "#00FF00");
    const result = themeTransaction.commit();
    expect(result.success).toBe(true);
    expect(result.changedCount).toBeGreaterThanOrEqual(1);
    expect(themeRegistry.getToken("color.primary")!.value).toBe("#00FF00");
    expect(themeTransaction.isActive()).toBe(false);
  });

  it("should reject commit with validation errors", () => {
    themeTransaction.begin();
    themeRegistry.setTokenValue("color.primary", "{nonexistent}");
    const result = themeTransaction.commit();
    expect(result.success).toBe(false);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it("should report transaction state", () => {
    themeTransaction.begin();
    themeRegistry.setTokenValue("color.primary", "#EEE");
    const state = themeTransaction.state;
    expect(state.active).toBe(true);
    expect(state.affectedCount).toBe(1);
  });
});
