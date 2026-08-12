import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockResolveActivePlan } = vi.hoisted(() => ({
  mockResolveActivePlan: vi.fn(),
}));

vi.mock("../plan-source", () => ({
  resolveActivePlan: mockResolveActivePlan,
}));

import { hasAnyCapability, assertAnyCapability } from "../capability-gates";

const INTEGRATIONS_CAPABILITIES = ["api_access", "webhooks", "live_social_sync"];

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveActivePlan.mockReset();
});

describe("hasAnyCapability", () => {
  it("returns true when the plan grants one of the capabilities", () => {
    expect(hasAnyCapability("creator_scale", INTEGRATIONS_CAPABILITIES)).toBe(true);
  });

  it("returns false when the plan grants none of the capabilities", () => {
    expect(hasAnyCapability("creator_launch", INTEGRATIONS_CAPABILITIES)).toBe(false);
  });

  it("returns false for a null/absent plan code", () => {
    expect(hasAnyCapability(null, INTEGRATIONS_CAPABILITIES)).toBe(false);
    expect(hasAnyCapability(undefined, INTEGRATIONS_CAPABILITIES)).toBe(false);
  });

  it("is satisfied by a single matching capability", () => {
    expect(hasAnyCapability("creator_scale", ["webhooks"])).toBe(true);
  });
});

describe("assertAnyCapability", () => {
  it("resolves the active plan and returns granted when entitled", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_scale", origin: "v2", status: "active" });

    const result = await assertAnyCapability({ tenantId: "t1", capabilities: INTEGRATIONS_CAPABILITIES });

    expect(mockResolveActivePlan).toHaveBeenCalledWith(null, "t1");
    expect(result.granted).toBe(true);
    expect(result.code).toBe("creator_scale");
  });

  it("throws Forbidden when the plan is not entitled", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "active" });

    await expect(assertAnyCapability({ tenantId: "t1", capabilities: INTEGRATIONS_CAPABILITIES })).rejects.toThrow("Forbidden");
  });

  it("throws Forbidden when the tenant has no subscription", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: null, origin: "none", status: null });

    await expect(assertAnyCapability({ tenantId: "t1", capabilities: INTEGRATIONS_CAPABILITIES })).rejects.toThrow("Forbidden");
  });

  it("supports a custom error message", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "active" });

    await expect(
      assertAnyCapability({ tenantId: "t1", capabilities: INTEGRATIONS_CAPABILITIES, message: "Scale required" }),
    ).rejects.toThrow("Scale required");
  });
});