"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  getTenantResendIntegration,
  saveResendIntegration,
  verifyResendIntegration,
  disconnectResendIntegration,
} from "@/modules/tenant-integration/resend";

async function requireCreatorTenant(): Promise<{ tenantId: string; actor: string }> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user?.id) throw new Error("Unauthorized");
  // Only creators (ADMIN) and super admin can manage Resend integration
  if (role === "AGENCY_ADMIN" || role === "AGENCY_STAFF" || role === "SUPPORT" || role === "READ_ONLY") {
    throw new Error("Forbidden");
  }
  const tenantId = session.user.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  const actor = session.user.email ?? session.user.name ?? "creator";
  return { tenantId, actor };
}

export async function getMyResendIntegration(): Promise<
  | { ok: true; integration: Awaited<ReturnType<typeof getTenantResendIntegration>> }
  | { ok: false; error: string }
> {
  try {
    const { tenantId } = await requireCreatorTenant();
    const integration = await getTenantResendIntegration(tenantId);
    return { ok: true, integration };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized" };
  }
}

export async function saveMyResendIntegration(input: {
  apiKey: string;
  emailFrom: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantId, actor } = await requireCreatorTenant();
    const res = await saveResendIntegration(tenantId, input, actor);
    if (res.success) revalidatePath("/admin/integrations");
    return { success: res.success, error: res.error };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to save" };
  }
}

export async function verifyMyResendIntegration(): Promise<{
  success: boolean;
  verified?: boolean;
  error?: string;
}> {
  try {
    const { tenantId, actor } = await requireCreatorTenant();
    const res = await verifyResendIntegration(tenantId, actor);
    if (res.success) revalidatePath("/admin/integrations");
    return res;
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Verification failed" };
  }
}

export async function disconnectMyResendIntegration(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { tenantId, actor } = await requireCreatorTenant();
    const res = await disconnectResendIntegration(tenantId, actor);
    if (res.success) revalidatePath("/admin/integrations");
    return res;
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to disconnect" };
  }
}
