import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    affiliateLink: {
      findFirst: h.mockFindFirst,
      update: h.mockUpdate,
    },
  },
}));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));

import { AffiliateService } from "@/services/affiliate.service";

const LINK = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const TENANT_A = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  h.mockFindFirst.mockReset();
  h.mockUpdate.mockReset();
});

describe("RCCF-65.3 — AffiliateService.incrementClicks scoping (active + tenant)", () => {
  it("increments an active link owned by the tenant", async () => {
    h.mockFindFirst.mockResolvedValue({ id: LINK, tenantId: TENANT_A, isActive: true });

    await AffiliateService.incrementClicks(LINK, TENANT_A);

    // Lookup is scoped to BOTH tenant and active status — no other id can match.
    expect(h.mockFindFirst).toHaveBeenCalledWith({
      where: { id: LINK, tenantId: TENANT_A, isActive: true },
    });
    expect(h.mockUpdate).toHaveBeenCalledWith({
      where: { id: LINK },
      data: { clicks: { increment: 1 } },
    });
  });

  it("does not increment an inactive link", async () => {
    h.mockFindFirst.mockResolvedValue(null);

    await expect(AffiliateService.incrementClicks(LINK, TENANT_A)).rejects.toThrow("Affiliate not found");
    expect(h.mockUpdate).not.toHaveBeenCalled();
  });

  it("does not increment a deleted/nonexistent link", async () => {
    h.mockFindFirst.mockResolvedValue(null);

    await expect(AffiliateService.incrementClicks(LINK, TENANT_A)).rejects.toThrow("Affiliate not found");
    expect(h.mockUpdate).not.toHaveBeenCalled();
  });

  it("does not increment another tenant's link (cross-tenant)", async () => {
    // Creator A's storefront cannot increment B's link — the scoped lookup
    // (tenantId = A) returns nothing for B's row.
    h.mockFindFirst.mockImplementation(
      ({ where }: { where: { id: string; tenantId: string } }) =>
        where.id === LINK && where.tenantId === TENANT_A
          ? { id: LINK, tenantId: TENANT_A, isActive: true }
          : null,
    );

    await expect(
      AffiliateService.incrementClicks(LINK, "22222222-2222-4222-8222-222222222222"),
    ).rejects.toThrow("Affiliate not found");
    expect(h.mockUpdate).not.toHaveBeenCalled();
  });
});
