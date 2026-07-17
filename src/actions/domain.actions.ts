"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { VercelService } from "@/services/vercel.service";
import type { VercelVerificationRecord } from "@/services/vercel.service";
import { revalidatePath } from "next/cache";
import { gateFeature } from "@/lib/feature-gate";

export type DomainActionState = {
  success: boolean;
  error?: string;
  customDomain?: string | null;
  verified?: boolean;
  verification?: VercelVerificationRecord[];
};

async function requireAuth(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.user.tenantId) throw new Error("No tenant associated with account");
  return session.user.tenantId;
}

export async function attachCustomDomain(
  _prevState: DomainActionState,
  formData: FormData,
): Promise<DomainActionState> {
  const raw = formData.get("domain");
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return { success: false, error: "Domain is required" };
  }

  const domain = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");

  try {
    const tenantId = await requireAuth();

    const domainGate = await gateFeature(tenantId, "customDomain");
    if (!domainGate.allowed) {
      return { success: false, error: domainGate.error };
    }

    const vercelResult = await VercelService.addDomain(domain);
    if (!vercelResult.success) {
      return { success: false, error: vercelResult.error || "Failed to add domain to Vercel" };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomain: domain },
    });

    const status = await VercelService.getDomainStatus(domain);

    await logAction(tenantId, "attachCustomDomain", { domain });

    revalidatePath("/admin/settings/domain");
    return {
      success: true,
      customDomain: domain,
      verified: status.verified,
      verification: status.verification,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to attach domain",
    };
  }
}

export async function removeCustomDomain(): Promise<DomainActionState> {
  try {
    const tenantId = await requireAuth();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true },
    });

    if (!tenant?.customDomain) {
      return { success: false, error: "No custom domain configured" };
    }

    await VercelService.removeDomain(tenant.customDomain);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomain: null },
    });

    await logAction(tenantId, "removeCustomDomain", { domain: tenant.customDomain });

    revalidatePath("/admin/settings/domain");
    return { success: true, customDomain: null, verified: false };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove domain",
    };
  }
}

export async function checkDomainStatus(): Promise<DomainActionState> {
  try {
    const tenantId = await requireAuth();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true },
    });

    if (!tenant?.customDomain) {
      return { success: false, error: "No custom domain configured" };
    }

    const status = await VercelService.getDomainStatus(tenant.customDomain);

    if (status.verified) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { customDomain: tenant.customDomain },
      });
    }

    revalidatePath("/admin/settings/domain");
    return {
      success: true,
      customDomain: tenant.customDomain,
      verified: status.verified,
      verification: status.verification,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check domain status",
    };
  }
}

export async function verifyDomain(): Promise<DomainActionState> {
  try {
    const tenantId = await requireAuth();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true },
    });

    if (!tenant?.customDomain) {
      return { success: false, error: "No custom domain configured" };
    }

    const status = await VercelService.verifyDomain(tenant.customDomain);

    await logAction(tenantId, "verifyDomain", { domain: tenant.customDomain, verified: status.verified });

    revalidatePath("/admin/settings/domain");
    return {
      success: true,
      customDomain: tenant.customDomain,
      verified: status.verified,
      verification: status.verification,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify domain",
    };
  }
}

export async function getCustomDomain(): Promise<DomainActionState> {
  try {
    const tenantId = await requireAuth();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true },
    });

    if (!tenant?.customDomain) {
      return { success: true, customDomain: null, verified: false };
    }

    const status = await VercelService.getDomainStatus(tenant.customDomain);

    return {
      success: true,
      customDomain: tenant.customDomain,
      verified: status.verified,
      verification: status.verification,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get domain info",
    };
  }
}
