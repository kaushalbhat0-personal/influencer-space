import { describe, it, expect } from "vitest";
import { billingMigrationRegistry, LEGACY_CONSUMERS, BillingMigrationRegistry } from "@/modules/billing/application/migration-registry";

describe("BillingMigrationRegistry", () => {
  it("tracks the audit-derived legacy consumers", () => {
    expect(LEGACY_CONSUMERS.length).toBeGreaterThanOrEqual(10);
    expect(LEGACY_CONSUMERS.some((c) => c.id === "tenants-list" && c.kind === "reader")).toBe(true);
    expect(LEGACY_CONSUMERS.some((c) => c.id === "update-subscription-plan" && c.kind === "writer")).toBe(true);
  });

  it("reports migration percent and remaining readers/writers", () => {
    const status = billingMigrationRegistry.getStatus();
    expect(status.total).toBe(LEGACY_CONSUMERS.length);
    expect(status.migrationPercent).toBeGreaterThan(0);
    expect(status.migrationPercent).toBeLessThanOrEqual(100);
    expect(status.remainingReaders.every((c) => c.kind === "reader")).toBe(true);
    expect(status.remainingWriters.every((c) => c.kind === "writer")).toBe(true);
  });

  it("markMigrated advances the migration percentage", () => {
    const registry = new BillingMigrationRegistry();
    const before = registry.getStatus();
    const allMigrated = registry.list().map((c) => c.id);
    for (const id of allMigrated) registry.markMigrated(id);
    const after = registry.getStatus();
    expect(after.migrationPercent).toBe(100);
    expect(after.remaining).toEqual([]);
    expect(before.migrationPercent).toBeLessThan(100);
  });
});
