/**
 * RCCF-72.7 — lifecycle-gate backfill + data-integrity helpers.
 *
 * Tenants provisioned before the `onboarding_completed` lifecycle gate existed
 * (RCCF-72.6 F2 root cause) have a Website but no Setting row, which the DB
 * lifecycle resolver (lib/lifecycle/service.ts) treated as ONBOARDING, causing
 * requireTenant() -> redirect("/onboarding") to loop with the middleware's
 * token-based resolver. The resolver is reconciled in service.ts; this module
 * backfills the missing Setting rows and exposes an integrity check so the
 * invariant "Website exists => onboarding_completed eventually exists" is
 * verifiable.
 *
 * The Setting row written here matches `markOnboardingComplete`
 * (src/actions/onboarding.actions.ts) exactly: `{ completedAt: ISO string }`.
 * No schema/migration change; no User/Tenant/Website/Workspace rows touched.
 */

export const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

/** Minimal structural slice of PrismaClient this module needs (test-friendly). */
export interface LifecyclePrisma {
  setting: {
    findUnique(args: {
      where: { tenantId_key: { tenantId: string; key: string } };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    upsert(args: {
      where: { tenantId_key: { tenantId: string; key: string } };
      update: { value: unknown };
      create: { tenantId: string; key: string; value: unknown };
    }): Promise<unknown>;
  };
  website: {
    findMany(args: { select: { tenantId: true } }): Promise<{ tenantId: string }[]>;
  };
  user: {
    findFirst(args: {
      where: { tenantId: string; role: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
}

export interface LifecycleDriftRow {
  tenantId: string;
  websiteId: string;
}

/**
 * Tenants that violate the lifecycle invariant: a Website exists but the
 * `onboarding_completed` Setting does not.
 */
export async function findLifecycleDrift(
  prisma: LifecyclePrisma,
): Promise<LifecycleDriftRow[]> {
  const websites = await prisma.website.findMany({ select: { tenantId: true } });
  const tenantIds = Array.from(new Set(websites.map((w) => w.tenantId)));

  const drift: LifecycleDriftRow[] = [];
  for (const tenantId of [...tenantIds]) {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: ONBOARDING_COMPLETED_KEY } },
      select: { id: true },
    });
    if (!setting) {
      drift.push({ tenantId, websiteId: tenantId });
    }
  }
  return drift;
}

export interface BackfillOptions {
  /** Report what would change without writing. Default false. */
  dryRun?: boolean;
  /** Clock override for tests. Default `() => new Date().toISOString()`. */
  now?: () => string;
}

export interface BackfillResult {
  scannedTenants: number;
  withWebsite: number;
  missingSetting: number;
  written: number;
  skippedHasSetting: number;
  skippedNoAdmin: number;
  /** tenantIds written (empty when dryRun). */
  writtenTenants: string[];
  /** tenantIds skipped because no ADMIN owner existed. */
  skippedNoAdminTenants: string[];
}

/**
 * Idempotent, tenant-scoped backfill of `onboarding_completed` for tenants that
 * have a Website but no Setting. Only tenants with an ADMIN user are touched
 * (mirrors the pre-existing RCCF-70.6.6 backfill). Safe to run repeatedly.
 */
export async function backfillOnboardingCompleted(
  prisma: LifecyclePrisma,
  options: BackfillOptions = {},
): Promise<BackfillResult> {
  const now = options.now ?? (() => new Date().toISOString());
  const websites = await prisma.website.findMany({ select: { tenantId: true } });
  const tenantIds = Array.from(new Set(websites.map((w) => w.tenantId)));

  const result: BackfillResult = {
    scannedTenants: tenantIds.length,
    withWebsite: tenantIds.length,
    missingSetting: 0,
    written: 0,
    skippedHasSetting: 0,
    skippedNoAdmin: 0,
    writtenTenants: [],
    skippedNoAdminTenants: [],
  };

  for (const tenantId of [...tenantIds]) {
    const existing = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: ONBOARDING_COMPLETED_KEY } },
      select: { id: true },
    });
    if (existing) {
      result.skippedHasSetting++;
      continue;
    }

    result.missingSetting++;

    const admin = await prisma.user.findFirst({
      where: { tenantId, role: "ADMIN" },
      select: { id: true },
    });
    if (!admin) {
      result.skippedNoAdmin++;
      result.skippedNoAdminTenants.push(tenantId);
      continue;
    }

    if (options.dryRun) continue;

    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: ONBOARDING_COMPLETED_KEY } },
      update: { value: { completedAt: now() } },
      create: { tenantId, key: ONBOARDING_COMPLETED_KEY, value: { completedAt: now() } },
    });
    result.written++;
    result.writtenTenants.push(tenantId);
  }

  return result;
}
