import { describe, it, expect, vi, beforeEach } from "vitest";
import { COMMERCE_PLANS } from "@/config/commerce/plans";

const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { billingPlan: { findMany: mockFindMany } },
}));

import { getRuntimePlans, getComparisonPlans } from "@/modules/pricing/application/runtime";

type MockRow = {
  code: string;
  name: string;
  family: string;
  price: number;
  currency: string;
  status: string;
  gracePeriodDays: number | null;
  runtimeConfig: unknown;
};

const canonicalRows: MockRow[] = COMMERCE_PLANS.map((p) => ({
  code: p.code,
  name: p.name,
  family: p.family,
  price: p.price ?? 0,
  currency: p.currency,
  status: "ACTIVE",
  gracePeriodDays: 0,
  runtimeConfig: null,
}));

// The six legacy rows recover-seed.sql inserts (Starter/Pro/Elite/Free/Studio/Agency).
const legacyRows: MockRow[] = [
  { code: "creator_free", name: "Starter", family: "creator", price: 0, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: null },
  { code: "creator_pro", name: "Pro", family: "creator", price: 999, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: null },
  { code: "creator_elite", name: "Elite", family: "creator", price: 2999, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: null },
  { code: "agency_free", name: "Free", family: "agency", price: 0, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: null },
  { code: "agency_studio", name: "Studio", family: "agency", price: 1999, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: null },
  { code: "agency_agency", name: "Agency", family: "agency", price: 4999, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: null },
];

beforeEach(() => {
  mockFindMany.mockReset();
});

describe("RCCF-SUBSCRIPTIONS-01 — runtime DB-only plan filtering", () => {
  it("never surfaces legacy seed rows in the runtime catalog", async () => {
    mockFindMany.mockResolvedValue([...canonicalRows, ...legacyRows]);
    const codes = (await getRuntimePlans()).map((p) => p.code);
    for (const legacy of legacyRows) {
      expect(codes).not.toContain(legacy.code);
    }
    for (const cfg of COMMERCE_PLANS) {
      expect(codes).toContain(cfg.code);
    }
  });

  it("surfaces a genuinely runtime-created plan with runtimeConfig", async () => {
    mockFindMany.mockResolvedValue([
      ...canonicalRows,
      {
        code: "partner_custom",
        name: "Partner Custom",
        family: "partner",
        price: 1200,
        currency: "INR",
        status: "ACTIVE",
        gracePeriodDays: 0,
        runtimeConfig: { family: "partner", marketing: { description: "Runtime plan" } },
      },
    ]);
    const codes = (await getRuntimePlans()).map((p) => p.code);
    expect(codes).toContain("partner_custom");
  });

  it("excludes non-ACTIVE rows even when runtimeConfig is set", async () => {
    mockFindMany.mockResolvedValue([
      ...canonicalRows,
      {
        code: "retired_plan",
        name: "Retired",
        family: "creator",
        price: 500,
        currency: "INR",
        status: "DEPRECATED",
        gracePeriodDays: 0,
        runtimeConfig: { marketing: { description: "No longer sold" } },
      },
    ]);
    const codes = (await getRuntimePlans()).map((p) => p.code);
    expect(codes).not.toContain("retired_plan");
  });

  it("excludes legacy codes even if a runtimeConfig was later attached", async () => {
    mockFindMany.mockResolvedValue([
      ...canonicalRows,
      { code: "creator_pro", name: "Pro", family: "creator", price: 999, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: { marketing: { description: "Legacy" } } },
    ]);
    const codes = (await getRuntimePlans()).map((p) => p.code);
    expect(codes).not.toContain("creator_pro");
  });

  it("shows only the three public creator plans in the comparison grid", async () => {
    mockFindMany.mockResolvedValue([...canonicalRows, ...legacyRows]);
    const codes = (await getComparisonPlans("creator")).map((p) => p.code);
    expect(codes).toEqual(["creator_launch", "creator_grow", "creator_scale"]);
  });

  it("shows only the three public partner plans in the comparison grid", async () => {
    mockFindMany.mockResolvedValue([...canonicalRows, ...legacyRows]);
    const codes = (await getComparisonPlans("partner")).map((p) => p.code);
    expect(codes).toEqual(["partner_free", "partner_solo", "partner_scale"]);
  });
});
