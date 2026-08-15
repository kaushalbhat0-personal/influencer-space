import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockGetTenantContext: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockIncrementClicks: vi.fn(),
  mockHeaderGet: vi.fn(),
  mockLogAction: vi.fn(),
  mockGetServerSession: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/services/affiliate.service", () => ({ AffiliateService: { incrementClicks: h.mockIncrementClicks } }));
vi.mock("@/services/storage.service", () => ({ StorageService: {} }));
vi.mock("@/modules/billing/application/content-limit.enforcement", () => ({ enforceContentLimit: vi.fn() }));
vi.mock("@/lib/tenant", () => ({ getTenantContext: h.mockGetTenantContext }));
vi.mock("@/lib/security/rate-limiter", () => ({ checkRateLimit: h.mockCheckRateLimit }));
vi.mock("next/headers", () => ({ headers: () => ({ get: h.mockHeaderGet }) }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));

import { incrementAffiliateClicks } from "@/actions/affiliate.actions";

const LINK_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const LINK_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

function okRate(): ReturnType<typeof h.mockCheckRateLimit> {
  return { allowed: true, remaining: 59, resetAt: Date.now() + 60_000, retryAfterMs: 0 };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.mockGetTenantContext.mockResolvedValue({ id: TENANT_A });
  h.mockCheckRateLimit.mockReturnValue(okRate());
  h.mockIncrementClicks.mockResolvedValue(undefined);
  h.mockHeaderGet.mockReturnValue("8.8.8.8");
});

describe("RCCF-65.3 — public affiliate click tracking (incrementAffiliateClicks)", () => {
  it("anonymous visitor increments an active link scoped to the served tenant", async () => {
    h.mockGetServerSession.mockResolvedValue(null);
    const res = await incrementAffiliateClicks(LINK_A);

    expect(res.success).toBe(true);
    // Tenant is server-derived — never a client-supplied id.
    expect(h.mockGetTenantContext).toHaveBeenCalled();
    expect(h.mockIncrementClicks).toHaveBeenCalledWith(LINK_A, TENANT_A);
  });

  it("authenticated visitor increments the same way (session is not required)", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "u1", tenantId: TENANT_A } });
    const res = await incrementAffiliateClicks(LINK_A);

    expect(res.success).toBe(true);
    expect(h.mockIncrementClicks).toHaveBeenCalledWith(LINK_A, TENANT_A);
    // No audit row is written for a public counter increment.
    expect(h.mockLogAction).not.toHaveBeenCalled();
  });

  it("rejects a crafted id that does not belong to the served tenant (service scoped)", async () => {
    // The service layer (AffiliateService.incrementClicks) scopes by tenantId,
    // so a B link under A's storefront resolves to nothing. Simulate that by
    // rejecting the call — the action reports failure without a success claim.
    h.mockIncrementClicks.mockRejectedValue(new Error("Affiliate not found"));

    const res = await incrementAffiliateClicks(LINK_B);

    expect(res.success).toBe(false);
    expect(res.error).toBe("Failed to increment clicks");
  });

  it("does not accept a client-supplied tenant (only the id is passed)", async () => {
    // incrementAffiliateClicks(id) has no tenant input at all; the tenant
    // always comes from getTenantContext. Assert the boundary by confirming the
    // service receives exactly (id, serverTenantId) and never the caller's value.
    h.mockGetTenantContext.mockResolvedValue({ id: TENANT_A });
    await incrementAffiliateClicks(LINK_A);

    expect(h.mockIncrementClicks.mock.calls[0]).toEqual([LINK_A, TENANT_A]);
    expect(h.mockIncrementClicks.mock.calls[0][1]).not.toBe(TENANT_B);
  });

  it("rejects malformed id input without calling any service", async () => {
    for (const bad of ["", "not-a-uuid", "aaa", "javascript:alert(1)"]) {
      const res = await incrementAffiliateClicks(bad);
      expect(res.success).toBe(false);
      expect(h.mockIncrementClicks).not.toHaveBeenCalled();
    }
    expect(h.mockGetTenantContext).not.toHaveBeenCalled();
  });

  it("fails closed when no storefront tenant can be resolved (no header / unknown host)", async () => {
    h.mockGetTenantContext.mockResolvedValue(null);

    const res = await incrementAffiliateClicks(LINK_A);

    expect(res.success).toBe(false);
    expect(h.mockIncrementClicks).not.toHaveBeenCalled();
  });

  it("returns failure (never throws) when the increment fails — navigation is unaffected", async () => {
    h.mockIncrementClicks.mockRejectedValue(new Error("db down"));

    const res = await incrementAffiliateClicks(LINK_A);

    // Structured failure, not an exception — the client's try/catch + window.open
    // path continues regardless.
    expect(res.success).toBe(false);
    expect(res.error).toBe("Failed to increment clicks");
  });

  it("rate-limits repeated requests per IP (reuses the platform limiter)", async () => {
    h.mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000, retryAfterMs: 60_000 });

    const res = await incrementAffiliateClicks(LINK_A);

    expect(res.success).toBe(false);
    expect(res.error).toBe("Too many requests");
    expect(h.mockIncrementClicks).not.toHaveBeenCalled();
    expect(h.mockCheckRateLimit).toHaveBeenCalledWith("/affiliate-clicks:8.8.8.8", "/affiliate-clicks");
  });

  it("falls back to a shared bucket when no IP header is present", async () => {
    h.mockHeaderGet.mockReturnValue(null);

    await incrementAffiliateClicks(LINK_A);

    expect(h.mockCheckRateLimit).toHaveBeenCalledWith("/affiliate-clicks:unknown", "/affiliate-clicks");
  });
});
