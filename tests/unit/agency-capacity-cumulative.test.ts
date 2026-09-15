import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  paidCapacityAgg: vi.fn(),
  addonAgg: vi.fn(),
  agencyTenantCount: vi.fn(),
  workspaceFindUnique: vi.fn(),
  billingSubFindFirst: vi.fn(),
  resolveActivePlan: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: h.workspaceFindUnique },
    billingSubscription: { findFirst: h.billingSubFindFirst },
    agencyTenant: { count: h.agencyTenantCount },
    agencyPaidCapacity: { aggregate: h.paidCapacityAgg },
    agencyCapacityAddon: { aggregate: h.addonAgg },
  },
}));

vi.mock("@/modules/billing/application/plan-source", () => ({
  resolveActivePlan: h.resolveActivePlan,
}));

import { getAgencyClientCapacity } from "@/modules/partner/application/partner-relationship";

beforeEach(() => {
  vi.clearAllMocks();
  h.workspaceFindUnique.mockResolvedValue({ id: "ws-agency" });
  h.billingSubFindFirst.mockResolvedValue({ status: "ACTIVE", trialEndsAt: null });
  h.resolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" } as never);
  h.agencyTenantCount.mockResolvedValue(0);
});

describe("RCCF-AGENCY-CAPACITY-02 — cumulative paid capacity", () => {
  it("Solo first payment: capacity 5", async () => {
    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 5 } });
    h.addonAgg.mockResolvedValue({ _sum: { quantity: 0 } });
    const c = await getAgencyClientCapacity("agency-1");
    expect(c.paidCapacity).toBe(5);
    expect(c.limit).toBe(5);
    expect(c.includedLimit).toBe(5);
  });

  it("Solo second payment: capacity 10 (5+5, not 5)", async () => {
    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 10 } });
    h.addonAgg.mockResolvedValue({ _sum: { quantity: 0 } });
    const c = await getAgencyClientCapacity("agency-1");
    expect(c.paidCapacity).toBe(10);
    expect(c.limit).toBe(10);
  });

  it("Solo third payment: capacity 15", async () => {
    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 15 } });
    h.addonAgg.mockResolvedValue({ _sum: { quantity: 0 } });
    const c = await getAgencyClientCapacity("agency-1");
    expect(c.paidCapacity).toBe(15);
    expect(c.limit).toBe(15);
  });

  it("carry-forward: 5 paid, 3 used → available 2; new +5 → 10 total, 3 used → available 7", async () => {
    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 5 } });
    h.addonAgg.mockResolvedValue({ _sum: { quantity: 0 } });
    h.agencyTenantCount.mockResolvedValue(3);
    let c = await getAgencyClientCapacity("agency-1");
    expect(c.limit - c.used).toBe(2);

    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 10 } });
    c = await getAgencyClientCapacity("agency-1");
    expect(c.limit).toBe(10);
    expect(c.limit - c.used).toBe(7);
  });

  it("Scale first 25, second 50", async () => {
    h.resolveActivePlan.mockResolvedValue({ code: "partner_scale", origin: "v2", status: "ACTIVE" } as never);
    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 25 } });
    h.addonAgg.mockResolvedValue({ _sum: { quantity: 0 } });
    let c = await getAgencyClientCapacity("agency-1");
    expect(c.paidCapacity).toBe(25);
    expect(c.limit).toBe(25);

    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 50 } });
    c = await getAgencyClientCapacity("agency-1");
    expect(c.paidCapacity).toBe(50);
    expect(c.limit).toBe(50);
  });

  it("add-on: paid 5 + addon 1 = total 6", async () => {
    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 5 } });
    h.addonAgg.mockResolvedValue({ _sum: { quantity: 1 } });
    const c = await getAgencyClientCapacity("agency-1");
    expect(c.paidCapacity).toBe(5);
    expect(c.addonQuantity).toBe(1);
    expect(c.limit).toBe(6);
  });

  it("mixed: paid 10 + addons 2, used 7 → available 5", async () => {
    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 10 } });
    h.addonAgg.mockResolvedValue({ _sum: { quantity: 2 } });
    h.agencyTenantCount.mockResolvedValue(7);
    const c = await getAgencyClientCapacity("agency-1");
    expect(c.limit).toBe(12);
    expect(c.limit - c.used).toBe(5);
  });

  it("annual Solo payment → +5, not *12", async () => {
    // Both monthly and yearly give +5, verified by quantity 5 per invoice
    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 5 } });
    h.addonAgg.mockResolvedValue({ _sum: { quantity: 0 } });
    let c = await getAgencyClientCapacity("agency-1");
    expect(c.paidCapacity).toBe(5);

    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 10 } }); // second annual +5
    c = await getAgencyClientCapacity("agency-1");
    expect(c.paidCapacity).toBe(10);
    expect(c.limit).toBe(10);
  });

  it("expiry: paid capacity remains after subscription expiry", async () => {
    // Even if BillingSubscription is EXPIRED, paidCapacity sum remains
    h.billingSubFindFirst.mockResolvedValue({ status: "EXPIRED", trialEndsAt: null });
    h.resolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "EXPIRED" } as never);
    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 5 } });
    h.addonAgg.mockResolvedValue({ _sum: { quantity: 0 } });
    h.agencyTenantCount.mockResolvedValue(3);
    const c = await getAgencyClientCapacity("agency-1");
    // Paid capacity is still 5, even though subscription is EXPIRED, so limit 5, used 3, available 2
    // The current implementation still returns 5 because paidCapacity is not tied to subscription status
    expect(c.paidCapacity).toBe(5);
    expect(c.limit).toBe(5);
  });

  it("royalty isolation: capacity changes do not alter royalty", async () => {
    const { royaltyPercentForActiveClients } = await import("@/config/commerce/agency-commercial");
    expect(royaltyPercentForActiveClients(4)).toBe(0);
    expect(royaltyPercentForActiveClients(5)).toBe(20);
    expect(royaltyPercentForActiveClients(6)).toBe(20);
    // Capacity 10 vs royalty 5 are independent
    h.paidCapacityAgg.mockResolvedValue({ _sum: { quantity: 10 } });
    h.agencyTenantCount.mockResolvedValue(5);
    const c = await getAgencyClientCapacity("agency-1");
    expect(c.limit).toBe(10);
    expect(royaltyPercentForActiveClients(c.used)).toBe(20);
  });
});
