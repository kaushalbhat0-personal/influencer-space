"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runtimeEventBus } from "@/modules/event-runtime";
import { computeFromSignals } from "@/modules/customer-success";
import { loadSignals, getCustomerTimeline, getPlatformSuccessCenter, getAgencySuccessClients } from "@/modules/customer-success";
import type { CustomerSuccess, RiskLevel } from "@/modules/customer-success";

const SUCCESS_KEY = "customer_success_checkin";
const SUCCESS_HIGH_RISK: RiskLevel[] = ["high", "critical"];

/**
 * RCCF-EPIC-09: compute a creator's CustomerSuccess and emit events when the
 * stage / risk / opportunities change since the last check-in. Deterministic,
 * read-only, derived from the canonical Runtime Context.
 *
 * RCCF-72.17C.4 (DASH-03): `prebuilt` carries the success + timeline already
 * computed by the dashboard's getDashboardData() from the SAME request-scoped
 * Runtime Context. When supplied, the expensive `loadSignals → context build`
 * and timeline reads are skipped — the action only performs the check-in
 * side-effect (change detection + events + persisted check-in). Authorization
 * is unchanged: the tenant is still derived from the server session.
 */
export async function getMyCustomerSuccess(prebuilt?: {
  success: CustomerSuccess;
  timeline?: Awaited<ReturnType<typeof getCustomerTimeline>>;
}): Promise<{ ok: boolean; success?: CustomerSuccess; timeline?: Awaited<ReturnType<typeof getCustomerTimeline>>; error?: string }> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return { ok: false, error: "Unauthorized" };

  let success = prebuilt?.success ?? null;
  let timeline = prebuilt?.timeline ?? [];
  if (!success) {
    const signals = await loadSignals(tenantId);
    success = computeFromSignals(signals);
    timeline = await getCustomerTimeline(tenantId, 20);
  }

  const previous = await prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: SUCCESS_KEY } }, select: { value: true } });
  const prev = (previous?.value ?? {}) as { stage?: string; risk?: string; opportunities?: string[] };

  const events: Array<{ type: "success.stage.changed" | "risk.changed" | "opportunity.detected" | "customer.activated" | "customer.retained" | "customer.churn-risk"; payload: Record<string, unknown> }> = [];
  if (prev.stage !== success.stage) events.push({ type: "success.stage.changed", payload: { from: prev.stage ?? null, to: success.stage } });
  if (prev.risk !== success.risk) {
    events.push({ type: "risk.changed", payload: { from: prev.risk ?? null, to: success.risk } });
    if (SUCCESS_HIGH_RISK.includes(success.risk)) events.push({ type: "customer.churn-risk", payload: { risk: success.risk, findings: success.riskFindings.map((f) => f.label) } });
  }
  if (success.stage === "first_sale" && prev.stage !== "first_sale") events.push({ type: "customer.activated", payload: { stage: success.stage, score: success.score } });
  if (success.score >= 70 && (prev as { score?: number }).score !== undefined && (prev as { score?: number }).score! < 70) events.push({ type: "customer.retained", payload: { score: success.score } });
  const newOpportunities = success.opportunities.filter((o) => !(prev.opportunities ?? []).includes(o.type));
  for (const o of newOpportunities) events.push({ type: "opportunity.detected", payload: { type: o.type, label: o.label, value: o.value } });

  for (const e of events) {
    await runtimeEventBus.publish({ type: e.type, tenantId, entityId: success.stage, payload: e.payload, occurredAt: new Date().toISOString() }).catch(() => {});
  }

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId, key: SUCCESS_KEY } },
    update: { value: { stage: success.stage, risk: success.risk, score: success.score, opportunities: success.opportunities.map((o) => o.type) } as never },
    create: { tenantId, key: SUCCESS_KEY, value: { stage: success.stage, risk: success.risk, score: success.score, opportunities: success.opportunities.map((o) => o.type) } as never },
  }).catch(() => {});

  return { ok: true, success, timeline };
}

/** Super Admin Customer Success Center (bounded cohort). */
export async function getCustomerSuccessCenterData(): Promise<{ ok: boolean; center?: Awaited<ReturnType<typeof getPlatformSuccessCenter>>; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPER_ADMIN") return { ok: false, error: "Unauthorized" };
  return { ok: true, center: await getPlatformSuccessCenter(250) };
}

/** Agency clients' success summary. */
export async function getAgencySuccessData(agencyId: string): Promise<{ ok: boolean; clients?: Awaited<ReturnType<typeof getAgencySuccessClients>>; error?: string }> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const agencyRole = role === "AGENCY_ADMIN" || role === "AGENCY_STAFF";
  if (role !== "SUPER_ADMIN" && !agencyRole) return { ok: false, error: "Unauthorized" };
  if (!session?.user) return { ok: false, error: "Unauthorized" };
  // RCCF-39: an agency actor may only read their OWN agency's client success
  // data; SUPER_ADMIN retains platform-wide access.
  if (agencyRole) {
    if (!session.user.agencyId || session.user.agencyId !== agencyId) return { ok: false, error: "Forbidden" };
    const { assertAgencyMembership } = await import("@/modules/partner/application/authorization");
    const membership = await assertAgencyMembership(session.user.id, agencyId);
    if (!membership.ok) return { ok: false, error: membership.error ?? "Forbidden" };
  }
  return { ok: true, clients: await getAgencySuccessClients(agencyId) };
}
