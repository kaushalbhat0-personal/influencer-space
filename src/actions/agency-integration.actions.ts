"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { requireAgencyActive } from "@/modules/partner/application/authorization";
import { getAgencyTenantId, getAgencyTenantIdForRead } from "@/modules/tenant-integration/agency-tenant";
import {
  getTenantResendIntegration,
  saveResendIntegration,
  verifyResendIntegration,
  disconnectResendIntegration,
} from "@/modules/tenant-integration/resend";

async function requireAgencyAdmin(): Promise<{ agencyId: string; actor: string; tenantId: string }> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (role !== "AGENCY_ADMIN") throw new Error("Forbidden: only agency admins can manage Resend");
  const active = await requireAgencyActive();
  if (!active.ok || !active.agencyId) throw new Error(active.error ?? "Agency not active");
  const agencyId = active.agencyId;
  const tenantId = await getAgencyTenantId(agencyId);
  if (!tenantId) throw new Error("Agency tenant not found");
  const actor = session.user.email ?? session.user.name ?? "agency-admin";
  return { agencyId, actor, tenantId };
}

async function requireAgencyViewer(): Promise<{ agencyId: string; tenantId: string | null }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.user.agencyId) throw new Error("No agency configured");
  const agencyId = session.user.agencyId as string;
  // Viewer can be STAFF or ADMIN — read-only
  const tenantId = await getAgencyTenantIdForRead(agencyId).catch(() => null);
  return { agencyId, tenantId };
}

export async function getAgencyResendIntegration(): Promise<
  | { ok: true; integration: Awaited<ReturnType<typeof getTenantResendIntegration>> }
  | { ok: false; error: string }
> {
  try {
    const { tenantId } = await requireAgencyViewer();
    if (!tenantId) return { ok: true, integration: null };
    const integration = await getTenantResendIntegration(tenantId);
    return { ok: true, integration };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized" };
  }
}

export async function saveAgencyResendIntegration(input: {
  apiKey: string;
  emailFrom: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantId, actor } = await requireAgencyAdmin();
    const res = await saveResendIntegration(tenantId, input, actor);
    if (res.success) revalidatePath("/agency/integrations");
    return { success: res.success, error: res.error };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to save" };
  }
}

export async function verifyAgencyResendIntegration(): Promise<{
  success: boolean;
  verified?: boolean;
  error?: string;
}> {
  try {
    const { tenantId, actor } = await requireAgencyAdmin();
    const res = await verifyResendIntegration(tenantId, actor);
    if (res.success) revalidatePath("/agency/integrations");
    return res;
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Verification failed" };
  }
}

export async function disconnectAgencyResendIntegration(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { tenantId, actor } = await requireAgencyAdmin();
    const res = await disconnectResendIntegration(tenantId, actor);
    if (res.success) revalidatePath("/agency/integrations");
    return res;
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to disconnect" };
  }
}
