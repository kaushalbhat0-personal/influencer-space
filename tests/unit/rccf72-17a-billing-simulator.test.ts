import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockHandleSubscriptionWebhook: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("@/modules/billing/application/service", () => ({
  billingService: { handleSubscriptionWebhook: h.mockHandleSubscriptionWebhook },
}));

import { simulateRazorpayEvent } from "@/actions/billing.actions";

function session(role: string | null) {
  if (role === null) return null;
  return { user: { id: "u1", role } };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.mockGetServerSession.mockResolvedValue(session("SUPER_ADMIN"));
  h.mockHandleSubscriptionWebhook.mockResolvedValue({ handled: true, status: "ACTIVE" });
});

describe("simulateRazorpayEvent — RCCF-72.17A SEC-02 authorization matrix", () => {
  it("rejects anonymous callers", async () => {
    h.mockGetServerSession.mockResolvedValue(null);
    const res = await simulateRazorpayEvent("subscription.activated", "ws-1", "creator_grow");
    expect(res).toEqual({ success: false, error: "Unauthorized" });
    expect(h.mockHandleSubscriptionWebhook).not.toHaveBeenCalled();
  });

  it.each(["ADMIN", "AGENCY_ADMIN", "SUPPORT", "READ_ONLY", "AGENCY_STAFF"])(
    "rejects %s callers",
    async (role) => {
      h.mockGetServerSession.mockResolvedValue(session(role));
      const res = await simulateRazorpayEvent("subscription.activated", "ws-1", "creator_grow");
      expect(res).toEqual({ success: false, error: "Unauthorized" });
      expect(h.mockHandleSubscriptionWebhook).not.toHaveBeenCalled();
    },
  );

  it("allows SUPER_ADMIN callers", async () => {
    const res = await simulateRazorpayEvent("subscription.activated", "ws-1", "creator_grow");
    expect(res.success).toBe(true);
    expect(h.mockHandleSubscriptionWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "subscription.activated", workspaceId: "ws-1" }),
    );
  });

  it("does not use a client-supplied tenantId/role/email as an authorization signal", async () => {
    // Even if a caller somehow passes a SUPER_ADMIN-like session shape is not
    // the vector; the point is the decision derives ONLY from the server
    // session role — a tenantId in the payload is irrelevant.
    h.mockGetServerSession.mockResolvedValue(session("ADMIN"));
    const res = await simulateRazorpayEvent("subscription.activated", "other-tenant-ws", "creator_scale");
    expect(res).toEqual({ success: false, error: "Unauthorized" });
    expect(h.mockHandleSubscriptionWebhook).not.toHaveBeenCalled();
  });

  it("stays denied even in non-production environments", async () => {
    // NODE_ENV is not production here (vitest), yet non-super-admins must be denied.
    h.mockGetServerSession.mockResolvedValue(session("ADMIN"));
    const res = await simulateRazorpayEvent("subscription.activated", "ws-1", "creator_grow");
    expect(res).toEqual({ success: false, error: "Unauthorized" });
  });
});