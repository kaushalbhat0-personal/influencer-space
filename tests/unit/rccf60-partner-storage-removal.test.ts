import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { capabilityService } from "@/lib/capabilities";
import { applyRuntimeFeatureOverrides, resetRuntimeFeatureOverrides } from "@/lib/capabilities/plans";
import { resolveStorageLimitBytes, resolveHeroVideoCapability, resolveStorageCapability, BYTES_PER_MB, BYTES_PER_GB } from "@/modules/billing/application/storage.enforcement";
import { APPROVED_STORAGE, getStorageDisplay, getComparisonFeatureIds } from "@/components/marketing/Pricing/data";

const { mockResolveActivePlan, mockAggregate } = vi.hoisted(() => ({
  mockResolveActivePlan: vi.fn(),
  mockAggregate: vi.fn(),
}));
vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: mockResolveActivePlan }));
vi.mock("@/lib/prisma", () => ({ prisma: { asset: { aggregate: mockAggregate } } }));
import { countStorageUsage } from "@/modules/billing/application/storage.enforcement";

afterEach(() => resetRuntimeFeatureOverrides());
beforeEach(() => {
  vi.clearAllMocks();
  mockResolveActivePlan.mockReset();
  mockAggregate.mockReset();
});

describe("RCCF-60.3 — Creator storage unchanged (RCCF-59 contract)", () => {
  it("Launch = 20 MB, Growth = 100 MB, Scale = 300 MB", () => {
    expect(resolveStorageLimitBytes("creator_launch")).toBe(20 * BYTES_PER_MB);
    expect(resolveStorageLimitBytes("creator_grow")).toBe(100 * BYTES_PER_MB);
    expect(resolveStorageLimitBytes("creator_scale")).toBe(300 * BYTES_PER_MB);
  });

  it("Enterprise remains Custom (configurable)", () => {
    expect(resolveStorageLimitBytes("creator_enterprise")).toBe(500 * BYTES_PER_GB);
  });

  it("Creator hero capability remains 12 MB / 15 s", () => {
    for (const code of ["creator_launch", "creator_grow", "creator_scale"]) {
      const hero = resolveHeroVideoCapability(code);
      expect(hero.enabled).toBe(true);
      expect(hero.maxSizeBytes).toBe(12 * BYTES_PER_MB);
      expect(hero.maxDurationSec).toBe(15);
    }
  });
});

describe("RCCF-60.3 — Partner plans have NO storage capability", () => {
  it("Launch / Solo / Scale / Enterprise resolve no storage", () => {
    for (const code of ["partner_free", "partner_solo", "partner_scale", "partner_enterprise"]) {
      expect(resolveStorageLimitBytes(code), `${code} must have no storage`).toBeNull();
    }
  });

  it("storage_gb / storage_mb are absent from Partner capability resolution", () => {
    for (const code of ["partner_free", "partner_solo", "partner_scale", "partner_enterprise"]) {
      expect(capabilityService.limit(code, "storage_gb")).toBe(0);
      expect(capabilityService.limit(code, "storage_mb")).toBe(0);
    }
  });

  it("resolveStorageCapability reports no storage limit for Partner plans", () => {
    expect(resolveStorageCapability("partner_solo").limitBytes).toBeNull();
    expect(resolveStorageCapability("partner_solo").limitMb).toBeNull();
  });

  it("a historical Partner runtimeConfig.storage_gb override is permanently inert", () => {
    applyRuntimeFeatureOverrides("partner_solo", { storage_gb: 500 });
    expect(capabilityService.limit("partner_solo", "storage_gb")).toBe(500); // persisted config still exists
    expect(resolveStorageLimitBytes("partner_solo")).toBeNull(); // but is NEVER authoritative
  });
});

describe("RCCF-60.3 — Agency never participates in storage accounting", () => {
  it("storage usage is scoped strictly by Creator tenantId", async () => {
    mockAggregate.mockResolvedValue({ _sum: { size: 7 * BYTES_PER_MB } });
    await countStorageUsage("creator-tenant-A");
    expect(mockAggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: "creator-tenant-A", status: { not: "DELETED" } } }));
  });

  it("Agency identity (agencyId) is not a storage scope — no agency storage surface exists", () => {
    const storageModule = readFileSync(join(process.cwd(), "src/modules/billing/application/storage.enforcement.ts"), "utf8");
    // All usage functions are tenant-scoped; there is no agency storage quota/usage/bucket API.
    expect(storageModule).toMatch(/tenantId/);
    expect(storageModule).not.toMatch(/agencyId: true|agency storage|agencyStorage/);
  });

  it("Partner client/team/capacity capabilities remain unchanged (RCCF-40/49/53)", () => {
    expect(capabilityService.limit("partner_free", "max_clients")).toBe(1);
    expect(capabilityService.limit("partner_solo", "max_clients")).toBe(5);
    expect(capabilityService.limit("partner_scale", "max_clients")).toBe(15);
    expect(capabilityService.limit("partner_enterprise", "max_clients")).toBe(-1);
    expect(capabilityService.limit("partner_solo", "max_team_members")).toBe(3);
    expect(capabilityService.can("partner_scale", "white_label").allowed).toBe(true);
  });
});

describe("RCCF-60.3 — marketing + Pricing Center", () => {
  it("marketing exposes Creator storage but never Partner storage", () => {
    expect(APPROVED_STORAGE.creator_launch).toBe("20 MB");
    expect(APPROVED_STORAGE.creator_grow).toBe("100 MB");
    expect(APPROVED_STORAGE.creator_scale).toBe("300 MB");
    expect(APPROVED_STORAGE.creator_enterprise).toBe("Custom");
    for (const code of ["partner_free", "partner_solo", "partner_scale", "partner_enterprise"]) {
      expect(APPROVED_STORAGE[code]).toBeUndefined();
      expect(getStorageDisplay(code)).toBe("—");
    }
    const partnerIds = new Set(getComparisonFeatureIds("partner"));
    expect(partnerIds.has("storage_gb")).toBe(false);
    expect(partnerIds.has("storage_mb")).toBe(false);
  });

  it("Pricing Center does not expose Partner storage as an editable capability", () => {
    const client = readFileSync(join(process.cwd(), "src/app/super-admin/pricing/_components/pricing-center-client.tsx"), "utf8");
    // The editor strips storage from non-Creator plans on load and hides the rows.
    expect(client).toMatch(/storage_mb/);
    expect(client).toMatch(/RCCF-60\.3/);
    expect(client).toMatch(/form\.family === "creator" \|\| \(f\.id !== "storage_mb" && f\.id !== "storage_gb"\)/);
  });
});
