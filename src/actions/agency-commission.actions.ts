"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  listAgencyCommissions,
  getAgencyCommissionSummary,
  recordManualPayment,
} from "@/lib/agency-commission/service";
import { revalidatePath } from "next/cache";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return null;
  return session;
}

async function requireAgencyOrSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = session.user.role;
  if (role === "SUPER_ADMIN" || role === "AGENCY_ADMIN" || role === "AGENCY_STAFF") return session;
  return null;
}

export async function getAgencyCommissionsAdmin(params: {
  agencyId?: string;
  tenantId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const session = await requireSuperAdmin();
  if (!session) return { success: false as const, error: "Unauthorized" };
  const result = await listAgencyCommissions({
    agencyId: params.agencyId || undefined,
    tenantId: params.tenantId || undefined,
    status: params.status || undefined,
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  });
  const summary = await getAgencyCommissionSummary(params.agencyId || undefined);
  // Hydrate agency/tenant names
  const agencyIds = Array.from(new Set(result.items.map((i) => i.agencyId)));
  const tenantIds = Array.from(new Set(result.items.map((i) => i.tenantId)));
  const [agencies, tenants] = await Promise.all([
    agencyIds.length ? prisma.websiteAgency.findMany({ where: { id: { in: agencyIds } }, select: { id: true, name: true } }) : [],
    tenantIds.length ? prisma.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true, subdomain: true } }) : [],
  ]);
  const agencyMap = new Map(agencies.map((a) => [a.id, a.name]));
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));
  return {
    success: true as const,
    data: result,
    summary,
    agencyMap: Object.fromEntries(agencyMap),
    tenantMap: Object.fromEntries(tenantMap),
  };
}

export async function getAgenciesForFilter() {
  const session = await requireSuperAdmin();
  if (!session) return { success: false as const, error: "Unauthorized" };
  const agencies = await prisma.websiteAgency.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return { success: true as const, agencies };
}

export async function recordAgencyCommissionPayment(input: {
  agencyId: string;
  amount: number;
  commissionIds?: string[];
  reference?: string;
  note?: string;
}) {
  const session = await requireSuperAdmin();
  if (!session) return { success: false as const, error: "Unauthorized" };
  try {
    const res = await recordManualPayment({
      agencyId: input.agencyId,
      amount: input.amount,
      commissionIds: input.commissionIds,
      reference: input.reference,
      note: input.note,
      adminId: session.user.id,
      adminEmail: session.user.email ?? undefined,
    });
    revalidatePath("/super-admin/agency-commissions");
    return { success: true as const, paymentId: res.paymentId };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Payment failed" };
  }
}

export async function getMyAgencyCommissions(params: { page?: number; limit?: number; status?: string }) {
  const session = await requireAgencyOrSuperAdmin();
  if (!session) return { success: false as const, error: "Unauthorized" };
  // Agency user must be linked to WebsiteAgency via user.agencyId
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { agencyId: true, role: true } });
  const agencyId: string | null = user?.agencyId ?? null;
  // Super admin can see all, but this endpoint is agency-scoped; super admin should use admin endpoint
  if (!agencyId && session.user.role === "SUPER_ADMIN") {
    return { success: false as const, error: "Super admin must use admin view" };
  }
  if (!agencyId) return { success: false as const, error: "No agency linked" };
  const result = await listAgencyCommissions({
    agencyId,
    status: params.status || undefined,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  });
  const summary = await getAgencyCommissionSummary(agencyId);
  return { success: true as const, data: result, summary, agencyId };
}
