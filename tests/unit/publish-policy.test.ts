import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolvePublishPolicy } from "@/lib/publishing/publish-policy";

const { mockGetRuntimePlan } = vi.hoisted(() => ({ mockGetRuntimePlan: vi.fn() }));

vi.mock("@/modules/pricing/application/runtime", () => ({
  getRuntimePlan: mockGetRuntimePlan,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetRuntimePlan.mockReset();
});

describe("resolvePublishPolicy — RCCF-31", () => {
  it("returns static defaults when no runtime override exists", async () => {
    mockGetRuntimePlan.mockResolvedValue(undefined);
    expect(await resolvePublishPolicy("creator_launch")).toEqual({ mode: "lifetime", limit: 3 });
    expect(await resolvePublishPolicy("creator_grow")).toEqual({ mode: "monthly", limit: 10 });
    expect(await resolvePublishPolicy("creator_scale")).toEqual({ mode: "unlimited", limit: null });
    expect(await resolvePublishPolicy("creator_enterprise")).toEqual({ mode: "unlimited", limit: null });
  });

  it("canonicalizes legacy codes", async () => {
    mockGetRuntimePlan.mockResolvedValue(undefined);
    expect(await resolvePublishPolicy("creator_free")).toEqual({ mode: "lifetime", limit: 3 });
    expect(await resolvePublishPolicy("creator_pro")).toEqual({ mode: "monthly", limit: 10 });
  });

  it("applies a Super Admin runtimeConfig.publishing override", async () => {
    mockGetRuntimePlan.mockResolvedValue({
      code: "creator_launch",
      publishing: { mode: "lifetime", limit: 5 },
    });
    expect(await resolvePublishPolicy("creator_launch")).toEqual({ mode: "lifetime", limit: 5 });
  });

  it("supports switching a plan to unlimited via runtime config", async () => {
    mockGetRuntimePlan.mockResolvedValue({
      code: "creator_grow",
      publishing: { mode: "unlimited", limit: null },
    });
    expect(await resolvePublishPolicy("creator_grow")).toEqual({ mode: "unlimited", limit: null });
  });

  it("falls back to defaults when the runtime read fails", async () => {
    mockGetRuntimePlan.mockRejectedValue(new Error("db down"));
    expect(await resolvePublishPolicy("creator_grow")).toEqual({ mode: "monthly", limit: 10 });
  });

  it("RCCF-36: a limit of 0 is a valid override (publishing blocked), not a fallback", async () => {
    mockGetRuntimePlan.mockResolvedValue({
      code: "creator_launch",
      publishing: { mode: "lifetime", limit: 0 },
    });
    expect(await resolvePublishPolicy("creator_launch")).toEqual({ mode: "lifetime", limit: 0 });
  });

  it("RCCF-36: a malformed negative limit falls back to canonical defaults (no bypass)", async () => {
    mockGetRuntimePlan.mockResolvedValue({
      code: "creator_launch",
      publishing: { mode: "lifetime", limit: -5 },
    });
    expect(await resolvePublishPolicy("creator_launch")).toEqual({ mode: "lifetime", limit: 3 });
  });

  it("RCCF-36: a non-numeric limit falls back to canonical defaults", async () => {
    mockGetRuntimePlan.mockResolvedValue({
      code: "creator_grow",
      publishing: { mode: "monthly", limit: "many" as never },
    });
    expect(await resolvePublishPolicy("creator_grow")).toEqual({ mode: "monthly", limit: 10 });
  });

  it("RCCF-36: an invalid mode string falls back to canonical defaults", async () => {
    mockGetRuntimePlan.mockResolvedValue({
      code: "creator_grow",
      publishing: { mode: "weekly" as never, limit: 5 },
    });
    expect(await resolvePublishPolicy("creator_grow")).toEqual({ mode: "monthly", limit: 10 });
  });
});