/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// RCCF-70.6.6 class-regression guard (BEHAVIORAL rewrite, RCCF-72.16A):
// every creator provisioning entry point that provisions a tenant + publishes a
// site MUST write onboarding_completed. The DB-backed requireTenant
// (lib/lifecycle/service.ts) treats the onboarding_completed Setting as the
// ONLY source of truth for READY; a creator path that skips it leaves the user
// looping /admin/dashboard ↔ /onboarding on fresh login.
//
// RCCF-72.16A moved these internal write calls onto the trusted server-only
// primitive `writeOnboardingComplete` (lib/onboarding/complete.ts) so the
// exported `markOnboardingComplete` server action can enforce ownership without
// regressing the provisioning flows. These tests assert the flows actually
// invoke that primitive after a successful publish.

const h = vi.hoisted(() => {
  const hoisted = {
    mockGetServerSession: vi.fn(),
    mockWriteOnboardingComplete: vi.fn(),
    mockPublish: vi.fn(),
    mockCreateRun: vi.fn(),
    mockProvision: vi.fn(),
    mockRunProvisionPipeline: vi.fn(),
    mockBuildProvisioningInput: vi.fn(),
    mockBuildBuilderArtifactData: vi.fn(),
    mockDetectPlatform: vi.fn(),
    mockBuildContentSource: vi.fn(),
    mockTrack: vi.fn(),
    mockLogAction: vi.fn(),
    mockCaptureError: vi.fn(),
    mockLogger: vi.fn(),
    mockPlanSummary: vi.fn(),
    mockEventBusPublish: vi.fn(),
    mockSettingUpsert: vi.fn(),
    mockProductCreate: vi.fn(),
    mockFindPlanByCode: vi.fn(),
    mockWorkspaceFindByTenantId: vi.fn(),
    mockWorkspaceAddMember: vi.fn(),
    mockWorkspaceMemberFindFirst: vi.fn(),
    mockLinkCreator: vi.fn(),
    mockRequireProvisioningActor: vi.fn(),
    reset: () => {
      for (const key of Object.keys(hoisted)) {
        if (key === "reset") continue;
        (hoisted as any)[key].mockReset();
      }
      hoisted.mockGetServerSession.mockResolvedValue({ user: { id: "u-admin", role: "SUPER_ADMIN", agencyId: null } });
      hoisted.mockWriteOnboardingComplete.mockResolvedValue({ success: true });
      hoisted.mockPublish.mockResolvedValue({ success: true });
      hoisted.mockCreateRun.mockResolvedValue("run-1");
      hoisted.mockProvision.mockResolvedValue({
        success: true,
        runId: "run-1",
        tenantId: "t1",
        tenantSlug: "creator-1",
        workspaceId: "ws-1",
        websiteId: "w1",
        storefrontUrl: "http://localhost:3000/t1",
        dashboardUrl: "http://localhost:3000/admin/t1",
        adminEmail: "creator@test.dev",
        temporaryPassword: "pw",
        websiteStatus: "published",
        tenantStatus: "ACTIVE",
        publicationStatus: "published",
      });
      hoisted.mockRunProvisionPipeline.mockResolvedValue({
        blueprint: { id: "bp-1" },
        artifacts: [{ id: "a1" }],
      });
      hoisted.mockBuildProvisioningInput.mockImplementation((input: any) => input);
      hoisted.mockBuildBuilderArtifactData.mockReturnValue({ artifacts: ["a1"] });
      hoisted.mockDetectPlatform.mockReturnValue("instagram");
      hoisted.mockBuildContentSource.mockReturnValue({ sourceUrl: "https://x", platform: "instagram" });
      hoisted.mockTrack.mockReturnValue(undefined);
      hoisted.mockLogAction.mockResolvedValue({});
      hoisted.mockCaptureError.mockImplementation(() => {});
      hoisted.mockLogger.mockImplementation(() => {});
      hoisted.mockPlanSummary.mockReturnValue({ code: "creator_launch", name: "Creator Launch" });
      hoisted.mockEventBusPublish.mockImplementation(() => {});
      hoisted.mockSettingUpsert.mockResolvedValue({ id: "setting-1" });
      hoisted.mockProductCreate.mockResolvedValue({ id: "p1" });
      hoisted.mockFindPlanByCode.mockResolvedValue({ id: "plan-1", code: "creator_launch" });
      hoisted.mockWorkspaceFindByTenantId.mockResolvedValue({ id: "ws-1" });
      hoisted.mockWorkspaceAddMember.mockResolvedValue({});
      hoisted.mockWorkspaceMemberFindFirst.mockResolvedValue(null);
      hoisted.mockLinkCreator.mockResolvedValue({});
      hoisted.mockRequireProvisioningActor.mockResolvedValue({
        ok: true,
        role: "SUPER_ADMIN",
        userId: "u-admin",
        session: { user: { id: "u-admin", role: "SUPER_ADMIN", agencyId: null } },
      });
    },
  };
  return hoisted;
});

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/onboarding/complete", () => ({ writeOnboardingComplete: h.mockWriteOnboardingComplete }));
vi.mock("@/lib/publishing/service", () => ({ publishingService: { publish: h.mockPublish } }));
vi.mock("@/modules/provisioning/application/provisioning-service", () => ({
  provisioningService: { createRun: h.mockCreateRun, provision: h.mockProvision },
}));
vi.mock("@/lib/generation/integration/provision-pipeline", () => ({
  runProvisionPipeline: h.mockRunProvisionPipeline,
  buildProvisioningInput: h.mockBuildProvisioningInput,
  buildBuilderArtifactData: h.mockBuildBuilderArtifactData,
  detectPlatform: h.mockDetectPlatform,
  buildContentSource: h.mockBuildContentSource,
}));
vi.mock("@/lib/analytics", () => ({ track: h.mockTrack }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: h.mockCaptureError }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: h.mockLogger, warn: h.mockLogger, error: h.mockLogger } }));
vi.mock("@/lib/capabilities", () => ({ capabilityService: { planSummary: h.mockPlanSummary } }));
vi.mock("@/lib/events", () => ({ platformEventBus: { publish: h.mockEventBusPublish, subscribe: vi.fn(() => () => {}) } }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    setting: { upsert: h.mockSettingUpsert },
    product: { create: h.mockProductCreate },
    workspaceMember: { findFirst: h.mockWorkspaceMemberFindFirst },
  },
}));
vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: { findPlanByCode: h.mockFindPlanByCode },
}));
vi.mock("@/modules/provisioning/application/creator-plan", async () => {
  const actual = await vi.importActual<typeof import("@/modules/provisioning/application/creator-plan")>("@/modules/provisioning/application/creator-plan");
  return { validateAgencyCreatorPlanCode: actual.validateAgencyCreatorPlanCode };
});
vi.mock("@/config/commerce/plans", () => ({
  getCommercePlan: (code: string) => ({ id: code, code, family: "creator", manual: false, enterprise: false }),
  isAgencyRestrictedPlan: () => false,
}));
vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: { findByTenantId: h.mockWorkspaceFindByTenantId, addMember: h.mockWorkspaceAddMember },
}));
vi.mock("@/modules/partner/application/partner-relationship", () => ({
  agencyTenantRelationship: { linkCreator: h.mockLinkCreator },
}));
vi.mock("@/modules/partner/application/authorization", () => ({
  requireProvisioningActor: h.mockRequireProvisioningActor,
  assertAgencyOwnsTenant: vi.fn().mockResolvedValue({ ok: false }),
}));
vi.mock("@/lib/acquisition", () => ({ acquisitionRegistry: { get: vi.fn() } }));

import { acquireAndProvision } from "@/actions/acquisition/acquire.actions";
import { provisionCreator } from "@/actions/provision.actions";
import { confirmProvision } from "@/actions/super-admin-provision.actions";

const acquireProfile = {
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
  h.reset();
});

describe("RCCF-70.6.6 / RCCF-72.16A — provisioning flows write onboarding complete after a successful publish", () => {
  it("provisionCreator (SUPER_ADMIN) invokes writeOnboardingComplete with the provisioned tenant", async () => {
    const res = await provisionCreator({
      runId: "run-1",
      creatorName: "Creator One",
      planCode: "creator_launch",
      category: "gaming",
      industry: "gaming",
    } as any);

    expect(res.success).toBe(true);
    expect(h.mockPublish).toHaveBeenCalledWith("t1");
    expect(h.mockWriteOnboardingComplete).toHaveBeenCalledWith("t1");
  });

  it("provisionCreator does NOT invoke writeOnboardingComplete when publish fails", async () => {
    h.mockPublish.mockResolvedValue({ success: false, error: "publish boom" });

    const res = await provisionCreator({
      runId: "run-1",
      creatorName: "Creator One",
      planCode: "creator_launch",
    } as any);

    expect(res.success).toBe(false);
    expect(h.mockWriteOnboardingComplete).not.toHaveBeenCalled();
  });

  it("confirmProvision (SUPER_ADMIN) invokes writeOnboardingComplete with the provisioned tenant", async () => {
    const res = await confirmProvision({
      sourceUrl: "https://instagram.com/creator",
      creatorName: "Creator Two",
      planCode: "creator_launch",
    });

    expect(res.success).toBe(true);
    expect(h.mockPublish).toHaveBeenCalledWith("t1");
    expect(h.mockWriteOnboardingComplete).toHaveBeenCalledWith("t1");
  });

  it("acquireAndProvision invokes writeOnboardingComplete after a successful publish", async () => {
    const res = await acquireAndProvision("manual", "https://instagram.com/store", acquireProfile);

    expect(res.success).toBe(true);
    expect(h.mockPublish).toHaveBeenCalledWith("t1");
    expect(h.mockWriteOnboardingComplete).toHaveBeenCalledWith("t1");
  });

  it("acquireAndProvision does NOT invoke writeOnboardingComplete when publish fails", async () => {
    h.mockPublish.mockResolvedValue({ success: false, error: "publish boom" });

    const res = await acquireAndProvision("manual", "https://instagram.com/store", acquireProfile);

    expect(res.success).toBe(false);
    expect(h.mockWriteOnboardingComplete).not.toHaveBeenCalled();
  });
});