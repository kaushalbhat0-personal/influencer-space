import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mock variables ───────────────────────────────────────────────────

const { mockSettingFindUnique, mockWebsiteFindUnique } = vi.hoisted(() => ({
  mockSettingFindUnique: vi.fn(),
  mockWebsiteFindUnique: vi.fn(),
}));

const { mockUserFindFirst, mockSettingUpsert } = vi.hoisted(() => ({
  mockUserFindFirst: vi.fn(),
  mockSettingUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    setting: {
      findUnique: mockSettingFindUnique,
      upsert: mockSettingUpsert,
    },
    website: {
      findUnique: mockWebsiteFindUnique,
      findMany: vi.fn(async () => [{ tenantId: "t-website" }, { tenantId: "t-has-setting" }]),
    },
    user: { findFirst: mockUserFindFirst },
  },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { lifecycleService } from "@/lib/lifecycle/service";
import { LifecycleState } from "@/lib/lifecycle/types";
import {
  backfillOnboardingCompleted,
  findLifecycleDrift,
  ONBOARDING_COMPLETED_KEY,
  type LifecyclePrisma,
} from "@/lib/lifecycle/backfill";
import { getPlan } from "@/lib/capabilities/plans";
import { capabilityService } from "@/lib/capabilities";

const TENANT = { userId: "user-1", tenantId: "tenant-1", role: "ADMIN" };

const makeWebsite = (state: string | null = null) => ({
  id: "website-1",
  publishStatus: state ? { state } : null,
});

function makeBackfillPrisma(overrides: Partial<LifecyclePrisma> = {}): LifecyclePrisma {
  const written = new Set<string>();
  const preexisting = new Set<string>(["t-b"]);

  const base: LifecyclePrisma = {
    setting: {
      findUnique: vi.fn(async ({ where }) => {
        const t = where.tenantId_key.tenantId;
        return written.has(t) || preexisting.has(t) ? { id: `setting-${t}` } : null;
      }),
      upsert: vi.fn(async ({ where }) => {
        written.add(where.tenantId_key.tenantId);
        return { id: `setting-${where.tenantId_key.tenantId}` };
      }),
    },
    website: {
      findMany: vi.fn(async () => [{ tenantId: "t-a" }, { tenantId: "t-b" }, { tenantId: "t-c" }]),
    },
    user: {
      findFirst: vi.fn(async () => ({ id: "admin-1" })),
    },
  };
  return { ...base, ...overrides, setting: { ...base.setting, ...(overrides.setting ?? {}) } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// 1. DB resolver — website + onboarding_completed
// =============================================================================

describe("lifecycle DB resolver (RCCF-72.7)", () => {
  it("returns READY for Website + onboarding_completed (not live)", async () => {
    mockSettingFindUnique.mockResolvedValue({ id: "setting-1" });
    mockWebsiteFindUnique.mockResolvedValue(makeWebsite());

    const lifecycle = await lifecycleService.resolve(TENANT);

    expect(lifecycle.state).toBe(LifecycleState.READY);
    expect(lifecycle.hasOnboardingCompleted).toBe(true);
    expect(lifecycle.hasWebsite).toBe(true);
  });

  it("returns PUBLISHED for Website + onboarding_completed when publishStatus is live", async () => {
    mockSettingFindUnique.mockResolvedValue({ id: "setting-1" });
    mockWebsiteFindUnique.mockResolvedValue(makeWebsite("live"));

    const lifecycle = await lifecycleService.resolve(TENANT);

    expect(lifecycle.state).toBe(LifecycleState.PUBLISHED);
    expect(lifecycle.hasPublishedSnapshot).toBe(true);
  });

  // =========================================================================
  // 2. DB resolver — website + MISSING onboarding_completed (the F2 case)
  // =========================================================================

  it("returns READY for Website + missing onboarding_completed (F2 case, no trap)", async () => {
    mockSettingFindUnique.mockResolvedValue(null);
    mockWebsiteFindUnique.mockResolvedValue(makeWebsite());

    const lifecycle = await lifecycleService.resolve(TENANT);

    expect(lifecycle.state).toBe(LifecycleState.READY);
    expect(lifecycle.hasOnboardingCompleted).toBe(true);
    expect(lifecycle.hasWebsite).toBe(true);
  });

  it("returns PUBLISHED for Website + missing onboarding_completed when live", async () => {
    mockSettingFindUnique.mockResolvedValue(null);
    mockWebsiteFindUnique.mockResolvedValue(makeWebsite("live"));

    const lifecycle = await lifecycleService.resolve(TENANT);

    expect(lifecycle.state).toBe(LifecycleState.PUBLISHED);
    expect(lifecycle.hasOnboardingCompleted).toBe(true);
  });

  // =========================================================================
  // 3. DB resolver — no website + no setting (new tenant gate preserved)
  // =========================================================================

  it("returns ONBOARDING for no Website + no onboarding_completed (new-user gate)", async () => {
    mockSettingFindUnique.mockResolvedValue(null);
    mockWebsiteFindUnique.mockResolvedValue(null);

    const lifecycle = await lifecycleService.resolve(TENANT);

    expect(lifecycle.state).toBe(LifecycleState.ONBOARDING);
    expect(lifecycle.hasOnboardingCompleted).toBe(false);
  });

  it("returns PROVISIONING for onboarding_completed + no Website (unchanged)", async () => {
    mockSettingFindUnique.mockResolvedValue({ id: "setting-1" });
    mockWebsiteFindUnique.mockResolvedValue(null);

    const lifecycle = await lifecycleService.resolve(TENANT);

    expect(lifecycle.state).toBe(LifecycleState.PROVISIONING);
    expect(lifecycle.hasOnboardingCompleted).toBe(true);
    expect(lifecycle.hasWebsite).toBe(false);
  });
});

// =============================================================================
// 4. Token resolver vs DB resolver agreement
// =============================================================================

describe("token/DB lifecycle agreement (RCCF-72.7)", () => {
  it("agrees for a Website tenant: both resolvers yield a post-onboarding state", async () => {
    const token = lifecycleService.resolveFromToken({ id: "user-1", tenantId: "tenant-1", role: "ADMIN" });
    expect(token.state).toBe(LifecycleState.READY);

    // Website + no Setting (legacy tenant) must NOT be trapped in ONBOARDING.
    mockSettingFindUnique.mockResolvedValue(null);
    mockWebsiteFindUnique.mockResolvedValue(makeWebsite());
    const db = await lifecycleService.resolve(TENANT);

    expect(db.state).toBe(LifecycleState.READY);
    expect(db.hasOnboardingCompleted).toBe(true);
  });

  it("preserves the fresh-tenant gate: DB resolver returns ONBOARDING for no Website + no Setting", async () => {
    mockSettingFindUnique.mockResolvedValue(null);
    mockWebsiteFindUnique.mockResolvedValue(null);

    const db = await lifecycleService.resolve(TENANT);
    expect(db.state).toBe(LifecycleState.ONBOARDING);
  });

  it("preserves provisioning: DB resolver returns PROVISIONING and never redirects", async () => {
    mockSettingFindUnique.mockResolvedValue({ id: "setting-1" });
    mockWebsiteFindUnique.mockResolvedValue(null);

    const db = await lifecycleService.resolve(TENANT);
    expect(db.state).toBe(LifecycleState.PROVISIONING);
    expect(db.hasOnboardingCompleted).toBe(true);
  });
});

// =============================================================================
// 5. Backfill idempotency
// =============================================================================

describe("backfillOnboardingCompleted (RCCF-72.7)", () => {
  it("is idempotent: second run writes zero", async () => {
    const prisma = makeBackfillPrisma();

    const first = await backfillOnboardingCompleted(prisma);
    const second = await backfillOnboardingCompleted(prisma);

    expect(first.written).toBeGreaterThan(0);
    expect(second.written).toBe(0);
    expect(second.skippedHasSetting).toBe(3);
  });

  // =========================================================================
  // 6. Existing onboarding-completed tenants unchanged
  // =========================================================================

  it("skips tenants that already have onboarding_completed (no upsert)", async () => {
    const prisma = makeBackfillPrisma({
      setting: {
        findUnique: vi.fn(async ({ where }) =>
          where.tenantId_key.tenantId === "t-b" ? { id: "existing" } : null,
        ),
        upsert: vi.fn(async () => ({ id: "new" })),
      },
    });

    const result = await backfillOnboardingCompleted(prisma);

    const upsertMock = prisma.setting.upsert as unknown as ReturnType<typeof vi.fn>;
    expect(result.skippedHasSetting).toBe(1);
    expect(upsertMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId_key: { tenantId: "t-b" } } }),
    );
  });

  it("never touches tenants without a Website", async () => {
    const prisma = makeBackfillPrisma({
      website: { findMany: vi.fn(async () => []) },
    });
    const result = await backfillOnboardingCompleted(prisma);
    expect(result.withWebsite).toBe(0);
    expect(result.written).toBe(0);
  });

  it("honors dryRun: reports but writes nothing", async () => {
    const prisma = makeBackfillPrisma();
    const result = await backfillOnboardingCompleted(prisma, { dryRun: true });
    expect(result.written).toBe(0);
    expect(prisma.setting.upsert).not.toHaveBeenCalled();
    expect(result.missingSetting).toBeGreaterThan(0);
  });

  it("writes the same Setting shape as markOnboardingComplete", async () => {
    const prisma = makeBackfillPrisma();
    await backfillOnboardingCompleted(prisma, { now: () => "2026-08-18T00:00:00.000Z" });
    expect(prisma.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_key: { tenantId: "t-a", key: ONBOARDING_COMPLETED_KEY } },
        create: {
          tenantId: "t-a",
          key: ONBOARDING_COMPLETED_KEY,
          value: { completedAt: "2026-08-18T00:00:00.000Z" },
        },
      }),
    );
  });

  it("skips tenants without an ADMIN owner", async () => {
    const prisma = makeBackfillPrisma({
      user: { findFirst: vi.fn(async () => null) },
    });
    const result = await backfillOnboardingCompleted(prisma);
    expect(result.written).toBe(0);
    expect(result.skippedNoAdmin).toBe(2);
    expect(result.skippedNoAdminTenants.length).toBe(2);
  });

  it("findLifecycleDrift reports only tenants with Website but no Setting", async () => {
    const prisma = makeBackfillPrisma({
      setting: {
        findUnique: vi.fn(async ({ where }) =>
          where.tenantId_key.tenantId === "t-b" ? { id: "existing" } : null,
        ),
        upsert: vi.fn(async () => ({ id: "new" })),
      },
    });
    const drift = await findLifecycleDrift(prisma);
    const ids = drift.map((d) => d.tenantId).sort();
    expect(ids).toEqual(["t-a", "t-c"]);
  });
});

// =============================================================================
// 7. Plan resolution unchanged
// =============================================================================

describe("plan resolution unchanged (RCCF-72.7)", () => {
  it("creator_grow still resolves with its full limits", () => {
    const plan = getPlan("creator_grow");
    expect(plan?.features.max_products).toBe(-1);
    expect(plan?.features.max_courses).toBe(-1);
    expect(plan?.features.max_games).toBe(10);
    expect(plan?.features.max_bookings).toBe(20);
    expect(plan?.features.storage_mb).toBe(100);
  });

  it("RCCF-72.15B: creator_launch now resolves with all core content types available", () => {
    const plan = getPlan("creator_launch");
    expect(plan?.features.max_products).toBe(3);
    expect(plan?.features.max_courses).toBe(3);
    expect(plan?.features.max_games).toBe(3);
    expect(plan?.features.max_testimonials).toBe(3);
    expect(plan?.features.max_faq).toBe(3);
    expect(plan?.features.storage_mb).toBe(20);
  });
});

// =============================================================================
// 8. Capability resolution unchanged
// =============================================================================

describe("capability resolution unchanged (RCCF-72.7)", () => {
  it("capabilityService.limit returns identical values", () => {
    expect(capabilityService.limit("creator_grow", "max_games")).toBe(10);
    expect(capabilityService.limit("creator_launch", "max_courses")).toBe(3);
    expect(capabilityService.limit("creator_launch", "max_games")).toBe(3);
    expect(capabilityService.limit("creator_scale", "max_bookings")).toBe(100);
    expect(capabilityService.limit("creator_scale", "custom_domain")).toBe(-1);
  });

  it("RCCF-72.15B: Launch core content types are capability-available", () => {
    expect(capabilityService.can("creator_grow", "max_bookings").allowed).toBe(true);
    expect(capabilityService.can("creator_launch", "max_courses").allowed).toBe(true);
    expect(capabilityService.can("creator_launch", "max_games").allowed).toBe(true);
  });
});
