import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { resolvePlan } from "@/lib/capabilities/plan-resolution";
import { capabilityService } from "@/lib/capabilities";
import { capabilitiesForPlan, COMMERCE_PLANS, razorpayPlanIdFor, getPartnerCommercePlans, isAgencyRestrictedPlan } from "@/config/commerce/plans";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { revenueService } from "@/modules/billing/application/revenue-service";
import { billingMigrationRegistry } from "@/modules/billing/application/migration-registry";
import { isTenantAgencyManaged } from "@/modules/billing/application/plan-restriction";
import { BillingHarnessClient } from "./_components/billing-harness-client";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Dev-only Billing Harness (IMPLEMENTATION-35) — engineering tool, not a user
 * feature. Immediate visibility into BillingSubscription, capabilities,
 * BillingEvents, invoices and webhook processing; plus a dev-only webhook
 * simulator to exercise the lifecycle.
 */
export default async function DevBillingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return <p className="p-8 text-sm text-zinc-400">Login required.</p>;
  }

  const [membership, v2Count, legacyCount] = await Promise.all([
    session.user.id
      ? workspaceRepository.findMembershipsByUserId(session.user.id).catch(() => [])
      : Promise.resolve([]),
    prisma.billingSubscription.count(),
    prisma.subscription.count(),
  ]);

  // IMPLEMENTATION-39: real revenue aggregates + migration status.
  const revenue = await revenueService.getRevenueDashboard().catch(() => null);
  const migration = billingMigrationRegistry.getStatus();

  const workspace = membership[0]?.workspace ?? null;
  const tenantId = session.user.tenantId ?? workspace?.tenantId ?? null;
  const resolved = await resolveActivePlan(workspace?.id ?? null, tenantId);
  const resolvedPlan = resolvePlan(resolved.code);

  const subscription = workspace
    ? await prisma.billingSubscription.findUnique({
        where: { workspaceId: workspace.id },
        include: { plan: { select: { code: true, name: true, price: true } } },
      })
    : null;

  const events = workspace
    ? await prisma.billingEvent.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
    : [];

  const lastInvoice = workspace
    ? await prisma.billingInvoice.findFirst({
        where: { workspaceId: workspace.id },
        orderBy: { issuedAt: "desc" },
      })
    : null;

  const capabilities = resolved.code ? capabilitiesForPlan(resolved.code) : [];
  const enabled = resolvedPlan.code ? capabilityService.planSummary(resolvedPlan.code) : null;
  const agencyManaged = await isTenantAgencyManaged(tenantId);
  const unrestrictedCode = subscription?.plan?.code ?? null;
  const restricted = agencyManaged && isAgencyRestrictedPlan(unrestrictedCode);

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-5xl space-y-4" data-testid="billing-harness">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--text-primary,#FAFAFA)]">Billing Harness (dev)</h1>
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted,#71717A)]">engineering tool</span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4 space-y-1 text-sm">
            <p className="mb-2 font-medium text-[var(--text-primary,#FAFAFA)]">Subscription</p>
            <p>plan: <span data-testid="bh-plan">{subscription?.plan?.code ?? resolvedPlan.code ?? "none"}</span> · status: <span data-testid="bh-status">{subscription?.status ?? resolved.status ?? "none"}</span></p>
            <p>renews: <span data-testid="bh-renews">{subscription?.renewsAt?.toISOString() ?? "—"}</span> · origin: <span data-testid="bh-origin">{resolved.origin}</span></p>
            <p>tier: <span data-testid="bh-tier">{resolvedPlan.tier}</span> · capability matrix: <span data-testid="bh-matrix">{resolved.code ? capabilitiesForPlan(resolved.code).join(", ") : "—"}</span></p>
            <p data-testid="bh-partner-restriction">
              partner-managed: <span data-testid="bh-partner-managed">{String(agencyManaged)}</span> · source plan: <span data-testid="bh-source-plan">{unrestrictedCode ?? "none"}</span> · effective: <span data-testid="bh-effective-plan">{resolved.code ?? "none"}</span>{restricted ? " · ⚠ clamped Launch → Grow (minimum)" : ""}
            </p>
            <p data-testid="bh-capabilities">enabled: {enabled ? Object.entries(enabled.features).filter(([, v]) => (typeof v === "boolean" ? v : typeof v === "number" ? v > 0 || v === -1 : Boolean(v))).map(([k]) => k).join(", ") : "—"}</p>
            <p data-testid="bh-webhook-count">webhook events: {events.length} · v2 subs: {v2Count} · legacy: {legacyCount}</p>
            <p data-testid="bh-last-invoice">last invoice: {lastInvoice ? `${lastInvoice.planCode} ${formatCurrency(lastInvoice.amount)} ${lastInvoice.status}` : "—"}</p>
          </div>

          <div className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4 text-xs">
            <p className="mb-2 font-medium text-[var(--text-primary,#FAFAFA)]">Plan mapping (config)</p>            <ul className="space-y-1" data-testid="bh-plan-mapping">
              {COMMERCE_PLANS.map((p) => (
                <li key={p.code} data-plan={p.code} className="flex justify-between text-[var(--text-secondary,#A1A1AA)]">
                  <span>{p.code}</span>
                  <span>{p.price === null ? "manual" : formatCurrency(p.price)} · razorpay: {razorpayPlanIdFor(p.code) ?? "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {workspace && (
          <BillingHarnessClient workspaceId={workspace.id} tenantId={tenantId ?? ""} planCode={subscription?.plan?.code ?? resolvedPlan.code ?? "creator_launch"} />
        )}

        <div className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4 text-xs">
          <p className="mb-2 font-medium text-[var(--text-primary,#FAFAFA)]" data-testid="bh-revenue">Revenue aggregates (Billing v2)</p>
          <p data-testid="bh-revenue-line">
            MRR: <span data-testid="bh-mrr">{formatCurrency(revenue?.mrr ?? 0)}</span> · ARR: <span data-testid="bh-arr">{formatCurrency(revenue?.arr ?? 0)}</span> · active subscribers: <span data-testid="bh-active-subs">{revenue?.activeSubscribers ?? 0}</span> · revenue/creator: <span data-testid="bh-arpc">{formatCurrency(revenue?.averageRevenuePerCreator ?? 0)}</span> · growth: <span data-testid="bh-growth">{revenue?.growth.growthPercent ?? 0}%</span>
          </p>
          <p className="mt-1">
            plan distribution: <span data-testid="bh-plan-distribution">{revenue?.planDistribution.map((p) => `${p.planName}:${p.count}`).join(", ") || "none"}</span> · paid invoices: <span data-testid="bh-paid-invoices">{revenue?.totalPaidInvoices ?? 0}</span>
          </p>
          <p className="mt-1 text-[var(--text-muted,#71717A)]" data-testid="bh-migration">
            migration: <span data-testid="bh-migration-pct">{migration.migrationPercent}%</span> ({migration.migratedCount}/{migration.total}) · remaining readers: <span data-testid="bh-remaining-readers">{migration.remainingReaders.length}</span> · remaining writers: <span data-testid="bh-remaining-writers">{migration.remainingWriters.length}</span>
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4 text-xs">
          <p className="mb-2 font-medium text-[var(--text-primary,#FAFAFA)]">Billing Timeline (events)</p>
          {events.length === 0 ? (
            <p className="text-[var(--text-muted,#71717A)]">No billing events yet.</p>
          ) : (
            <ol className="space-y-1" data-testid="bh-timeline">
              {events.map((e) => (
                <li key={e.id} data-event-type={e.type} className="flex justify-between text-[var(--text-secondary,#A1A1AA)]">
                  <span>{e.type}</span>
                  <span className="text-[var(--text-muted,#71717A)]">{e.createdAt.toISOString()}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
