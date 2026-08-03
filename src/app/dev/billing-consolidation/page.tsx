import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActivePlan, listAllSubscriptions } from "@/modules/billing/application/plan-source";
import { resolvePlan, LEGACY_READER_MIGRATION_STATUS } from "@/lib/capabilities/plan-resolution";
import { capabilityService } from "@/lib/capabilities";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";

export const dynamic = "force-dynamic";

/**
 * Dev-only Billing v2 Consolidation diagnostics (IMPLEMENTATION-33).
 * Observability only — never changes onboarding/billing behavior.
 */
export default async function BillingConsolidationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return <p className="p-8 text-sm text-zinc-400">Login required.</p>;
  }

  const [v2Count, legacyCount, membership, all] = await Promise.all([
    prisma.billingSubscription.count(),
    prisma.subscription.count(),
    session.user.id
      ? workspaceRepository.findMembershipsByUserId(session.user.id).catch(() => [])
      : Promise.resolve([]),
    listAllSubscriptions().catch(() => []),
  ]);

  const workspace = membership[0]?.workspace ?? null;
  const tenantId = session.user.tenantId ?? workspace?.tenantId ?? null;
  const resolved = await resolveActivePlan(workspace?.id ?? null, tenantId);
  const canonical = resolved.code ? resolvePlan(resolved.code) : null;
  const capabilitySource = canonical?.code ? (capabilityService.getPlan(canonical.code) ? "capabilityService" : "none") : "none";
  const premiumDecision = canonical?.code
    ? capabilityService.can(canonical.code, "premium_themes")
    : { allowed: false, reason: "no plan" };
  const migrated = LEGACY_READER_MIGRATION_STATUS.filter((r) => r.migrated).length;

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-lg font-semibold text-[var(--text-primary,#FAFAFA)]">Billing v2 Consolidation (dev)</h1>

        <div className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4 space-y-1 text-sm" data-testid="billing-diagnostics">
          <p>resolved plan: <span data-testid="bd-plan">{resolved.code ?? "none"}</span> · origin: <span data-testid="bd-origin">{resolved.origin}</span></p>
          <p>display: <span data-testid="bd-display">{canonical?.displayName ?? "—"}</span> · tier: <span data-testid="bd-tier">{canonical?.tier ?? "free"}</span> · family: <span data-testid="bd-family">{canonical?.family ?? "—"}</span></p>
          <p>capability source: <span data-testid="bd-capability-source">{capabilitySource}</span></p>
          <p>premium_themes: <span data-testid="bd-premium">{premiumDecision.allowed ? "allowed" : "denied"}</span>{premiumDecision.reason ? ` (${premiumDecision.reason})` : ""}</p>
          <p>v2 subscriptions: <span data-testid="bd-v2-count">{v2Count}</span> · legacy rows: <span data-testid="bd-legacy-count">{legacyCount}</span></p>
          <p>readers migrated: <span data-testid="bd-readers">{migrated}/{LEGACY_READER_MIGRATION_STATUS.length}</span></p>
        </div>

        <div className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4 text-xs">
          <p className="mb-2 font-medium text-[var(--text-primary,#FAFAFA)]">Reader migration status</p>
          <ul className="space-y-1" data-testid="bd-reader-list">
            {LEGACY_READER_MIGRATION_STATUS.map((r) => (
              <li key={r.reader} data-reader={r.reader} data-migrated={String(r.migrated)} className="flex justify-between text-[var(--text-secondary,#A1A1AA)]">
                <span>{r.reader}</span>
                <span className={r.migrated ? "text-emerald-400" : "text-amber-400"}>{r.migrated ? "migrated" : "pending"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-medium text-[var(--text-primary,#FAFAFA)]">Subscription rows ({all.length})</p>
          <ul className="space-y-0.5">
            {all.slice(0, 20).map((r) => (
              <li key={r.tenantId + r.origin} className="flex justify-between text-[var(--text-muted,#71717A)]">
                <span>{r.tenantName}</span>
                <span>{r.planCode} · {r.origin}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
