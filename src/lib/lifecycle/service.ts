import { LifecycleState, type LifecycleData } from "./types";
import { LifecycleService as BaseService } from "./token-resolver";

let prismaClient: unknown = null;

async function getPrisma() {
  if (!prismaClient) {
    const { prisma } = await import("@/lib/prisma");
    prismaClient = prisma;
  }
  return prismaClient as typeof import("@/lib/prisma")["prisma"];
}

class LifecycleServiceWithDb extends BaseService {
  async resolve(params: {
    userId?: string | null;
    tenantId?: string | null;
    role?: string | null;
    workspaceId?: string | null;
  }): Promise<LifecycleData> {
    const userId = params.userId ?? null;
    const tenantId = params.tenantId ?? null;
    const role = params.role ?? null;
    const workspaceId = params.workspaceId ?? null;

    if (!userId) {
      return {
        state: LifecycleState.VISITOR,
        userId: null, tenantId: null, workspaceId: null, role: null,
        hasOnboardingCompleted: false, hasWebsite: false, hasPublishedSnapshot: false,
      };
    }

    if (!tenantId) {
      return {
        state: LifecycleState.AUTHENTICATED,
        userId, tenantId: null, workspaceId: null, role,
        hasOnboardingCompleted: false, hasWebsite: false, hasPublishedSnapshot: false,
      };
    }

    const prisma = await getPrisma();
    const [onboardingSetting, websiteWithStatus] = await Promise.all([
      prisma.setting.findUnique({
        where: { tenantId_key: { tenantId, key: "onboarding_completed" } },
        select: { id: true },
      }),
      prisma.website.findUnique({
        where: { tenantId },
        select: {
          id: true,
          publishStatus: { select: { state: true } },
        },
      }),
    ]);

    const hasOnboardingCompleted = !!onboardingSetting;
    const hasWebsite = !!websiteWithStatus;
    const hasPublishedSnapshot = websiteWithStatus?.publishStatus?.state === "live";

    if (!hasOnboardingCompleted) {
      return {
        state: LifecycleState.ONBOARDING,
        userId, tenantId, workspaceId, role,
        hasOnboardingCompleted: false, hasWebsite, hasPublishedSnapshot,
      };
    }

    if (!hasWebsite) {
      return {
        state: LifecycleState.PROVISIONING,
        userId, tenantId, workspaceId, role,
        hasOnboardingCompleted: true, hasWebsite: false, hasPublishedSnapshot: false,
      };
    }

    return {
      state: hasPublishedSnapshot ? LifecycleState.PUBLISHED : LifecycleState.READY,
      userId, tenantId, workspaceId, role,
      hasOnboardingCompleted: true, hasWebsite: true, hasPublishedSnapshot,
    };
  }
}

export const lifecycleService = new LifecycleServiceWithDb();
