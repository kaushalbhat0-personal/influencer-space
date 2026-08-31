"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { VercelService } from "@/services/vercel.service";
import type { VercelVerificationRecord } from "@/services/vercel.service";
import { revalidatePath } from "next/cache";
import { entitlement } from "@/modules/billing/application/entitlements";
import { billingService } from "@/modules/billing/application/service";
import { workspaceService } from "@/modules/workspace/application/service";
import { getPlatformDomains } from "@/lib/platform/domains";

function normalizeDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "").replace(/^www\./, "").split("/")[0]!.split("?")[0]!.split("#")[0]!.trim();
}

function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  if (domain.includes(" ") || domain.includes("..") || domain.startsWith("-") || domain.startsWith(".") || domain.endsWith("-") || domain.endsWith(".")) return false;
  // Must contain at least one dot and a TLD of 2+ letters
  const parts = domain.split(".");
  if (parts.length < 2) return false;
  if (parts.some((p) => p.length === 0 || p.length > 63 || !/^[a-z0-9-]+$/.test(p))) return false;
  const tld = parts[parts.length - 1]!;
  if (!/^[a-z]{2,}$/.test(tld)) return false;
  return true;
}

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

  const domain = normalizeDomain(raw);
  if (!isValidDomain(domain)) {
    return { success: false, error: "Invalid domain format. Use example.com (without www or path)" };
  }
  const platformHosts = getPlatformDomains().map((d) => d.split(":")[0]!.toLowerCase().replace(/^www\./, ""));
  if (platformHosts.includes(domain) || platformHosts.some((p) => domain === p || domain.endsWith(`.${p}`))) {
    return { success: false, error: "Custom domain cannot be a platform domain" };
  }

  try {
    const tenantId = await requireAuth();

    const duplicate = await prisma.tenant.findFirst({
      where: { customDomain: domain, NOT: { id: tenantId } },
      select: { id: true },
    });
    if (duplicate) {
      return { success: false, error: "Domain is already assigned to another tenant" };
    }

    const ws = await workspaceService.resolveTenantId().then(() => workspaceService.getCurrent());
    const sub = ws ? await billingService.getSubscriptionStatus(ws.id) : null;
    const planCode = sub?.planCode ?? "creator_launch";
    const domainGate = entitlement.can(planCode, "custom_domain");
    if (!domainGate.allowed) {
      return { success: false, error: `Custom domains require an upgraded plan. Current plan: ${planCode}` };
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

