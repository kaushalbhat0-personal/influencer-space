import { prisma } from "@/lib/prisma";
import type { Assertion, AssertionCategory, Severity } from "./types";

export function identityAssertion(
  id: string,
  description: string,
  check: () => Promise<boolean> | boolean,
  severity: Severity = "critical",
): Assertion {
  return { id, category: "identity", description, severity, check };
}

export function lifecycleAssertion(
  id: string,
  description: string,
  check: () => Promise<boolean> | boolean,
  severity: Severity = "critical",
): Assertion {
  return { id, category: "lifecycle", description, severity, check };
}

export function generationAssertion(
  id: string,
  description: string,
  check: () => Promise<boolean> | boolean,
  severity: Severity = "critical",
): Assertion {
  return { id, category: "generation", description, severity, check };
}

export function provisioningAssertion(
  id: string,
  description: string,
  check: () => Promise<boolean> | boolean,
  severity: Severity = "critical",
): Assertion {
  return { id, category: "provisioning", description, severity, check };
}

export function publishingAssertion(
  id: string,
  description: string,
  check: () => Promise<boolean> | boolean,
  severity: Severity = "critical",
): Assertion {
  return { id, category: "publishing", description, severity, check };
}

export function storefrontAssertion(
  id: string,
  description: string,
  check: () => Promise<boolean> | boolean,
  severity: Severity = "critical",
): Assertion {
  return { id, category: "storefront", description, severity, check };
}

export function builderAssertion(
  id: string,
  description: string,
  check: () => Promise<boolean> | boolean,
  severity: Severity = "warning",
): Assertion {
  return { id, category: "builder", description, severity, check };
}

export function dashboardAssertion(
  id: string,
  description: string,
  check: () => Promise<boolean> | boolean,
  severity: Severity = "warning",
): Assertion {
  return { id, category: "dashboard", description, severity, check };
}

export function performanceAssertion(
  id: string,
  description: string,
  check: () => Promise<boolean> | boolean,
  severity: Severity = "warning",
): Assertion {
  return { id, category: "performance", description, severity, check };
}

export async function assertTenantExists(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  return !!tenant;
}

export async function assertWebsiteExists(tenantId: string): Promise<boolean> {
  const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
  return !!website;
}

export async function assertHasPublishedSnapshot(tenantId: string): Promise<boolean> {
  const website = await prisma.website.findUnique({
    where: { tenantId },
    select: { publishStatus: { select: { liveVersion: true } } },
  });
  return !!website?.publishStatus?.liveVersion;
}

export async function assertStorefrontReachable(storefrontUrl: string): Promise<boolean> {
  try {
    const response = await fetch(storefrontUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function assertUserHasRole(userId: string, role: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === role;
}
