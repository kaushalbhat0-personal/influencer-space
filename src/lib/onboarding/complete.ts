import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/modules/event-runtime";

/**
 * RCCF-72.16A — internal onboarding-complete write primitive.
 *
 * NOT a "use server" module, so it is never callable over the server-action
 * protocol. It is invoked only from trusted server-side flows that have already
 * authorized the caller against the target tenant (owner attachment,
 * SUPER_ADMIN provisioning, or AGENCY_ADMIN via assertAgencyOwnsTenant). The
 * exported `markOnboardingComplete` server action applies that authorization
 * gate and then delegates here.
 */
export async function writeOnboardingComplete(tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: "onboarding_completed" } },
      update: { value: { completedAt: new Date().toISOString() } },
      create: { tenantId, key: "onboarding_completed", value: { completedAt: new Date().toISOString() } },
    });
    await emitEvent("onboarding.completed", tenantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to mark onboarding" };
  }
}