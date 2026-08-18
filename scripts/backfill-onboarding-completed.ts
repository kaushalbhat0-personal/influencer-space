import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  backfillOnboardingCompleted,
  findLifecycleDrift,
  ONBOARDING_COMPLETED_KEY,
} from "../src/lib/lifecycle/backfill";

// RCCF-72.7 — lifecycle-gate backfill (dry-run report + apply).
//
// Backfills `onboarding_completed` Setting rows for tenants that have a Website
// but no Setting (the F2 root cause from RCCF-72.6). Idempotent and
// tenant-scoped; only touches the Setting table. Run with `--dry-run` (default)
// to print the report, or `--apply` to write.
//
//   npx tsx scripts/backfill-onboarding-completed.ts --dry-run
//   npx tsx scripts/backfill-onboarding-completed.ts --apply

const APPLY = process.argv.includes("--apply");

interface WebsiteRow {
  id: string;
  tenantId: string;
  publishStatus: { state: string } | null;
}

async function buildReport(websites: WebsiteRow[]) {
  const tenantIds = [...new Set(websites.map((w) => w.tenantId))];

  const [settings, legacySubs, workspaces] = await Promise.all([
    prisma.setting.findMany({
      where: { tenantId: { in: tenantIds }, key: ONBOARDING_COMPLETED_KEY },
      select: { tenantId: true },
    }),
    prisma.subscription.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { tenantId: true, plan: true, status: true },
    }),
    prisma.workspace.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { tenantId: true, id: true, status: true },
    }),
  ]);

  const wsIds = workspaces.map((w) => w.id);
  const billingSubs = wsIds.length
    ? await prisma.billingSubscription.findMany({
        where: { workspaceId: { in: wsIds } },
        select: { workspaceId: true, status: true, plan: { select: { code: true } } },
      })
    : [];

  const settingSet = new Set(settings.map((s) => s.tenantId));
  const legacyMap = new Map(legacySubs.map((s) => [s.tenantId, s]));
  const wsByTenant = new Map(workspaces.map((w) => [w.tenantId, w]));
  const billingByWs = new Map(billingSubs.map((b) => [b.workspaceId, b]));

  return tenantIds.map((tenantId) => {
    const website = websites.filter((w) => w.tenantId === tenantId);
    const ws = wsByTenant.get(tenantId);
    const billing = ws ? billingByWs.get(ws.id) : undefined;
    const legacy = legacyMap.get(tenantId);
    const planCode = billing?.plan?.code ?? legacy?.plan ?? null;
    const billingStatus = billing?.status ?? legacy?.status ?? null;
    const hasSetting = settingSet.has(tenantId);
    const hasWebsite = website.length > 0;
    const publishState = website[0]?.publishStatus?.state ?? null;
    // Post-fix resolver semantics (lib/lifecycle/service.ts).
    const resolverState = !hasWebsite
      ? "ONBOARDING"
      : publishState === "live"
        ? "PUBLISHED"
        : "READY";
    return {
      tenantId,
      websiteId: website[0]?.id ?? null,
      hasSetting,
      hasWebsite,
      lifecycleState: resolverState,
      planCode,
      planStatus: billingStatus,
      tenantActive: ws?.status === "ACTIVE",
    };
  });
}

async function main() {
  const websites = (await prisma.website.findMany({
    select: {
      id: true,
      tenantId: true,
      publishStatus: { select: { state: true } },
    },
  })) as WebsiteRow[];

  const drift = await findLifecycleDrift(prisma);
  const driftTenantIds = new Set(drift.map((d) => d.tenantId));

  console.log(`RCCF-72.7 lifecycle backfill (mode: ${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log(`Total tenants with a Website: ${[...new Set(websites.map((w) => w.tenantId))].length}`);
  console.log(`Tenants with Website but missing onboarding_completed: ${drift.length}`);
  console.log("");

  const report = await buildReport(websites);
  const targets = report.filter((r) => driftTenantIds.has(r.tenantId));

  if (targets.length === 0) {
    console.log("No tenants require backfill. Lifecycle invariant holds.");
    if (APPLY) console.log("Apply: nothing to do (idempotent).");
    return;
  }

  console.log("Targets:");
  for (const t of targets) {
    console.log(
      `  ${t.tenantId}  website=${t.websiteId}  lifecycle=${t.lifecycleState}  ` +
        `plan=${t.planCode}(${t.planStatus})  active=${t.tenantActive}`,
    );
  }
  console.log("");

  if (!APPLY) {
    console.log("DRY-RUN — re-run with --apply to backfill.");
    return;
  }

  const result = await backfillOnboardingCompleted(prisma);
  console.log("Backfill applied:");
  console.log(`  scannedTenants=${result.scannedTenants}`);
  console.log(`  withWebsite=${result.withWebsite}`);
  console.log(`  missingSetting=${result.missingSetting}`);
  console.log(`  written=${result.written}  (${result.writtenTenants.length})`);
  console.log(`  skippedHasSetting=${result.skippedHasSetting}`);
  console.log(`  skippedNoAdmin=${result.skippedNoAdmin}  (${result.skippedNoAdminTenants.length})`);

  const remaining = await findLifecycleDrift(prisma);
  console.log(`Remaining drift after apply: ${remaining.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
