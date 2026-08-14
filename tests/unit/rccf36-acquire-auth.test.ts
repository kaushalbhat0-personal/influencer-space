import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockCreateRun: vi.fn(),
  mockProvision: vi.fn(),
  mockPublish: vi.fn(),
  mockMarkOnboardingComplete: vi.fn(),
  mockLogAction: vi.fn(),
  mockTrack: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("@/modules/provisioning/application/provisioning-service", () => ({
  provisioningService: { createRun: h.mockCreateRun, provision: h.mockProvision },
}));
vi.mock("@/lib/publishing/service", () => ({ publishingService: { publish: h.mockPublish } }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { create: vi.fn() } } }));
vi.mock("@/lib/analytics", () => ({ track: h.mockTrack }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/actions/onboarding.actions", () => ({ markOnboardingComplete: h.mockMarkOnboardingComplete }));

import { acquireAndProvision } from "@/actions/acquisition/acquire.actions";

const profile = {
  businessName: "New Store",
  ownerName: "",
  category: "gaming",
  tagline: "",
  description: "",
  offers: [],
  socialLinks: [],
  palette: { primary: "#111", secondary: "#222" },
};

beforeEach(() => {
  vi.clearAllMocks();
  h.mockCreateRun.mockResolvedValue("run-1");
  h.mockProvision.mockResolvedValue({ success: true, tenantId: "t1", websiteId: "w1", tenantSlug: "new-store", storefrontUrl: "http://x/t", websiteStatus: "published" });
  h.mockPublish.mockResolvedValue({ success: true });
  h.mockMarkOnboardingComplete.mockResolvedValue(undefined);
  h.mockLogAction.mockResolvedValue(undefined);
  h.mockTrack.mockReturnValue(undefined);
});

describe("RCCF-36 — acquireAndProvision authorization", () => {
  it("rejects a normal CREATOR (cannot mint a new tenant)", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "u1", role: "CREATOR" } });

    const res = await acquireAndProvision("manual", "https://x", profile);

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Forbidden/i);
    expect(h.mockCreateRun).not.toHaveBeenCalled();
    expect(h.mockProvision).not.toHaveBeenCalled();
  });

  it("allows SUPER_ADMIN to provision a new tenant", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "sa", role: "SUPER_ADMIN" } });

    const res = await acquireAndProvision("manual", "https://x", profile);

    expect(res.success).toBe(true);
    expect(h.mockProvision).toHaveBeenCalled();
  });

  it("allows AGENCY_ADMIN to provision a new tenant", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN" } });

    const res = await acquireAndProvision("manual", "https://x", profile);

    expect(res.success).toBe(true);
    expect(h.mockProvision).toHaveBeenCalled();
  });

  it("rejects an anonymous caller", async () => {
    h.mockGetServerSession.mockResolvedValue(null);

    const res = await acquireAndProvision("manual", "https://x", profile);

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Unauthorized/i);
  });
});
