import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PARTNER_ADDON_UNIT_PRICE_INR, PARTNER_MIN_PAID_CAPACITY, PARTNER_TRIAL_DAYS, PARTNER_TRIAL_CLIENT_CAPACITY } from "@/config/commerce/agency-addons";
import { capabilityService } from "@/lib/capabilities";
import { resolveStorageLimitBytes } from "@/modules/billing/application/storage.enforcement";
import { getAgencyClientCapacity, agencyTenantRelationship } from "@/modules/partner/application/partner-relationship";
import { addAgencyCapacityAction, cancelAgencyCapacityAction } from "@/actions/partner.actions";

const v = vi.hoisted(() => {
  const links: Array<{ agencyId: string; tenantId: string; status: string }> = [];
  const addons: Array<{ id: string; agencyId: string; quantity: number; unitPriceInr: number; status: string; idempotencyKey: string }> = [];
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = (cb: () => unknown) => { const run = queue.then(cb); queue = run.catch(() => {}); return run; };
  const hoisted = {
    links, addons, serialize, seq: 0,
    subscription: { status: "TRIALING", trialEndsAt: new Date(Date.now() + 86400000 * 10) },
    planCode: "partner_free",
    reset: () => { links.length = 0; addons.length = 0; hoisted.seq = 0; queue = Promise.resolve(); hoisted.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() + 86400000 * 10) }; hoisted.planCode = "partner_free"; },
    mockGetServerSession: vi.fn(),
    mockLogAction: vi.fn(),
    mockRevalidatePath: vi.fn(),
  };
  return hoisted;
});

vi.mock("next-auth", () => ({ getServerSession: v.mockGetServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: v.mockRevalidatePath }));
vi.mock("@/lib/audit", () => ({ logAction: v.mockLogAction }));
vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: async () => ({ code: v.planCode, origin: "v2" as const, status: v.subscription.status }) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: async () => ({ id: "ws-a" }), findMany: async () => [{ id: "ws-a" }] },
    websiteAgency: { findUnique: async () => ({ status: "ACTIVE" }) },
    workspaceMember: { findFirst: async () => ({ id: "m1" }) },
    billingSubscription: { findFirst: async () => v.subscription, findMany: async () => [] },
    agencyTenant: {
      count: async ({ where }: { where: { agencyId: string; status: string } }) => v.links.filter((l) => l.agencyId === where.agencyId && l.status === where.status).length,
      findUnique: async ({ where }: { where: { tenantId: string } }) => v.links.find((l) => l.tenantId === where.tenantId) ?? null,
      create: async ({ data }: { data: { agencyId: string; tenantId: string; status: string } }) => { v.links.push(data); return { id: `rel-${data.tenantId}`, ...data }; },
      update: async () => ({}),
    },
    agencyCapacityAddon: {
      aggregate: async ({ where }: { where: { agencyId: string; status: string } }) => ({ _sum: { quantity: v.addons.filter((a) => a.agencyId === where.agencyId && a.status === where.status).reduce((s, a) => s + a.quantity, 0) } }),
      findMany: async ({ where: _where }: { where: { agencyId: string; status: string } }) => v.addons.filter((a) => a.agencyId === _where.agencyId && a.status === _where.status),
      findFirst: async ({ where: _where }: { where: { id: string; agencyId: string; status: string } }) => v.addons.find((a) => a.id === _where.id && a.agencyId === _where.agencyId && a.status === _where.status) ?? null,
      upsert: async ({ where, create }: { where: { agencyId_idempotencyKey: { agencyId: string; idempotencyKey: string } }; create: { agencyId: string; quantity: number; unitPriceInr: number; status: string; idempotencyKey: string } }) => {
        const existing = v.addons.find((a) => a.agencyId === where.agencyId_idempotencyKey.agencyId && a.idempotencyKey === where.agencyId_idempotencyKey.idempotencyKey);
        if (existing) return existing;
        const row = { id: `addon-${++v.seq}`, ...create };
        v.addons.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: { status: string; cancelledAt: Date } }) => {
        const a = v.addons.find((x) => x.id === where.id)!;
        a.status = data.status;
        return a;
      },
    },
    $transaction: async (arg: unknown) => {
      if (typeof arg === "function") {
        return v.serialize(() => (arg as (tx: unknown) => unknown)({
          $queryRaw: async () => {},
          agencyTenant: {
            count: async ({ where }: { where: { agencyId: string; status: string } }) => v.links.filter((l) => l.agencyId === where.agencyId && l.status === where.status).length,
            create: async ({ data }: { data: { agencyId: string; tenantId: string; status: string } }) => { v.links.push(data); return { id: `rel-${data.tenantId}`, ...data }; },
          },
        }));
      }
      return (arg as Array<Promise<unknown>>).reduce((p, op) => p.then(() => op), Promise.resolve());
    },
  },
}));

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const t = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function session(role: string, agencyId: string | null) {
  return { user: { id: "u1", email: "u@t.test", agencyId, role } };
}

beforeEach(() => {
  vi.clearAllMocks();
  v.reset();
  v.mockGetServerSession.mockResolvedValue(session("AGENCY_ADMIN", AGENCY_A));
  v.mockLogAction.mockResolvedValue(undefined);
});

describe("RCCF-61 — trial semantics", () => {
  it("Launch trial = 15 days and 1 client website", () => {
    expect(PARTNER_TRIAL_DAYS).toBe(15);
    expect(PARTNER_TRIAL_CLIENT_CAPACITY).toBe(1);
  });

  it("during an active trial the agency has 1 client capacity", async () => {
    v.planCode = "partner_free";
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() + 86400000 * 5) };
    const cap = await getAgencyClientCapacity(AGENCY_A);
    expect(cap.limit).toBe(1);
    expect(cap.trialExpired).toBe(false);
  });

  it("Launch cannot become indefinite free access — an expired trial yields zero capacity", async () => {
    v.planCode = "partner_free";
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 1) };
    const cap = await getAgencyClientCapacity(AGENCY_A);
    expect(cap.limit).toBe(0);
    expect(cap.trialExpired).toBe(true);
  });

  it("a paid subscription is required after trial — provisioning is blocked at zero capacity", async () => {
    v.planCode = "partner_free";
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 1) };
    await expect(agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: t(1) })).rejects.toThrow(/capacity/i);
  });
});

describe("RCCF-61 — paid minimum + add-on economics", () => {
  it("minimum paid capacity is 5 client websites", () => {
    expect(PARTNER_MIN_PAID_CAPACITY).toBe(5);
    expect(capabilityService.limit("partner_solo", "max_clients")).toBe(5);
  });

  it("additional capacity unit price is ₹1,499/month", () => {
    expect(PARTNER_ADDON_UNIT_PRICE_INR).toBe(1499);
  });

  it("an ACTIVE add-on increases effective max_clients", async () => {
    v.planCode = "partner_solo";
    v.addons.push({ id: "a1", agencyId: AGENCY_A, quantity: 2, unitPriceInr: 1499, status: "ACTIVE", idempotencyKey: "k1" });
    const cap = await getAgencyClientCapacity(AGENCY_A);
    expect(cap.includedLimit).toBe(5);
    expect(cap.addonQuantity).toBe(2);
    expect(cap.limit).toBe(7);
  });

  it("a cancelled add-on no longer counts", async () => {
    v.planCode = "partner_solo";
    v.addons.push({ id: "a1", agencyId: AGENCY_A, quantity: 3, unitPriceInr: 1499, status: "CANCELLED", idempotencyKey: "k1" });
    const cap = await getAgencyClientCapacity(AGENCY_A);
    expect(cap.limit).toBe(5);
  });

  it("Enterprise custom capacity stays unlimited even with add-ons", async () => {
    v.planCode = "partner_enterprise";
    v.addons.push({ id: "a1", agencyId: AGENCY_A, quantity: 2, unitPriceInr: 1499, status: "ACTIVE", idempotencyKey: "k1" });
    const cap = await getAgencyClientCapacity(AGENCY_A);
    expect(cap.limit).toBe(-1);
  });
});

describe("RCCF-61 — add-on actions (server-side authority + idempotency)", () => {
  it("adds capacity with the server-derived price and agency (client cannot spoof either)", async () => {
    const res = await addAgencyCapacityAction({ quantity: 3, idempotencyKey: "k-add" });
    expect(res.success).toBe(true);
    expect(res.unitPriceInr).toBe(1499);
    const row = v.addons.find((a) => a.agencyId === AGENCY_A && a.idempotencyKey === "k-add")!;
    expect(row.quantity).toBe(3);
    expect(row.unitPriceInr).toBe(1499);
  });

  it("a duplicate request with the same idempotency key is idempotent (no double add-on)", async () => {
    const first = await addAgencyCapacityAction({ quantity: 1, idempotencyKey: "k-dup" });
    const second = await addAgencyCapacityAction({ quantity: 1, idempotencyKey: "k-dup" });
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    const rows = v.addons.filter((a) => a.agencyId === AGENCY_A && a.idempotencyKey === "k-dup");
    expect(rows).toHaveLength(1);
  });

  it("rejects an invalid quantity (client-supplied quantity is validated)", async () => {
    const res = await addAgencyCapacityAction({ quantity: 0, idempotencyKey: "k0" });
    expect(res.success).toBe(false);
    expect(v.addons).toHaveLength(0);
  });

  it("staff cannot add capacity", async () => {
    v.mockGetServerSession.mockResolvedValue(session("AGENCY_STAFF", AGENCY_A));
    const res = await addAgencyCapacityAction({ quantity: 1, idempotencyKey: "k-staff" });
    expect(res.success).toBe(false);
    expect(v.addons).toHaveLength(0);
  });

  it("a creator (no agency) cannot add Agency capacity", async () => {
    v.mockGetServerSession.mockResolvedValue(session("ADMIN", null));
    const res = await addAgencyCapacityAction({ quantity: 1, idempotencyKey: "k-creator" });
    expect(res.success).toBe(false);
    expect(v.addons).toHaveLength(0);
  });

  it("Agency B cannot cancel Agency A's add-on (isolation)", async () => {
    v.addons.push({ id: "a1", agencyId: AGENCY_A, quantity: 1, unitPriceInr: 1499, status: "ACTIVE", idempotencyKey: "kA" });
    v.mockGetServerSession.mockResolvedValue(session("AGENCY_ADMIN", AGENCY_B));
    const res = await cancelAgencyCapacityAction("a1");
    expect(res.success).toBe(false);
    expect(v.addons[0].status).toBe("ACTIVE");
  });

  it("cancelling an add-on releases capacity (non-destructive history preserved)", async () => {
    v.planCode = "partner_solo";
    v.addons.push({ id: "a1", agencyId: AGENCY_A, quantity: 2, unitPriceInr: 1499, status: "ACTIVE", idempotencyKey: "kA" });
    const res = await cancelAgencyCapacityAction("a1");
    expect(res.success).toBe(true);
    expect(v.addons[0].status).toBe("CANCELLED");
    const cap = await getAgencyClientCapacity(AGENCY_A);
    expect(cap.limit).toBe(5);
  });
});

describe("RCCF-61 — capacity enforcement + reclaim", () => {
  it("offboarding (REVOKED) reclaims capacity", async () => {
    v.planCode = "partner_solo";
    v.links.push({ agencyId: AGENCY_A, tenantId: t(1), status: "ACTIVE" });
    v.links.push({ agencyId: AGENCY_A, tenantId: t(2), status: "ACTIVE" });
    v.links.push({ agencyId: AGENCY_A, tenantId: t(3), status: "ACTIVE" });
    const before = await getAgencyClientCapacity(AGENCY_A);
    expect(before.used).toBe(3);
    expect(before.remainingCapacity ?? before.limit - before.used).toBe(2);
    v.links.forEach((l) => { if (l.tenantId === t(1)) l.status = "REVOKED"; });
    const after = await getAgencyClientCapacity(AGENCY_A);
    expect(after.used).toBe(2);
  });

  it("concurrent provisioning cannot exceed the effective (included + add-on) capacity", async () => {
    v.planCode = "partner_solo";
    v.addons.push({ id: "a1", agencyId: AGENCY_A, quantity: 1, unitPriceInr: 1499, status: "ACTIVE", idempotencyKey: "k1" }); // 5 + 1 = 6
    for (let i = 0; i < 5; i++) v.links.push({ agencyId: AGENCY_A, tenantId: t(i + 1), status: "ACTIVE" }); // one free slot
    const results = await Promise.allSettled([
      agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: t(50) }),
      agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: t(51) }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
    expect(v.links.filter((l) => l.agencyId === AGENCY_A && l.status === "ACTIVE")).toHaveLength(6);
  });

  it("Agency A cannot affect Agency B (isolation)", async () => {
    v.links.push({ agencyId: AGENCY_B, tenantId: t(1), status: "ACTIVE" });
    const capA = await getAgencyClientCapacity(AGENCY_A);
    expect(capA.used).toBe(0);
    expect(v.links.filter((l) => l.agencyId === AGENCY_B && l.status === "ACTIVE")).toHaveLength(1);
  });
});

describe("RCCF-61 — boundaries (Creator/commission/team/storage/marketing)", () => {
  it("Partner storage remains absent; Creator storage unchanged", () => {
    expect(resolveStorageLimitBytes("partner_solo")).toBeNull();
    expect(resolveStorageLimitBytes("creator_launch")).toBe(20 * 1024 * 1024);
    expect(resolveStorageLimitBytes("creator_grow")).toBe(100 * 1024 * 1024);
    expect(resolveStorageLimitBytes("creator_scale")).toBe(300 * 1024 * 1024);
  });

  it("team capacity unchanged", () => {
    expect(capabilityService.limit("partner_free", "max_team_members")).toBe(1);
    expect(capabilityService.limit("partner_solo", "max_team_members")).toBe(3);
    expect(capabilityService.limit("partner_scale", "max_team_members")).toBe(10);
  });

  it("marketing reflects trial + paid minimum + ₹1,499 add-on, with no 'Free forever' or 'Unlimited clients'", () => {
    const config = readFileSync(join(process.cwd(), "src/config/commerce/plans.ts"), "utf8");
    const pricing = readFileSync(join(process.cwd(), "src/components/marketing/Pricing/index.tsx"), "utf8");
    expect(config).toMatch(/1 client website/);
    expect(config).toMatch(/paid partner plan \(from 5 client websites\)/);
    // MODERNIZED in RCCF-MKT-05: the marketing copy renders the canonical
    // PARTNER_ADDON_UNIT_PRICE_INR constant — no formatted UI literal.
    expect(pricing).toMatch(/PARTNER_ADDON_UNIT_PRICE_INR/);
    expect(pricing).not.toMatch(/₹1,499\/month/);
    expect(config.toLowerCase()).not.toMatch(/free forever/);
    expect(config.toLowerCase()).not.toMatch(/unlimited clients/);
    expect(pricing.toLowerCase()).not.toMatch(/unlimited clients/);
  });

  it("no duplicate pricing authority — the add-on price is centralized, not scattered", () => {
    const addonConfig = readFileSync(join(process.cwd(), "src/config/commerce/agency-addons.ts"), "utf8");
    expect(addonConfig).toContain("1499");
    // The add-on action derives the price from the canonical constant, not a UI-scattered literal.
    const action = readFileSync(join(process.cwd(), "src/actions/partner.actions.ts"), "utf8");
    expect(action).toMatch(/PARTNER_ADDON_UNIT_PRICE_INR/);
  });

  it("add-on creation never mutates Creator subscription/billing records", async () => {
    const res = await addAgencyCapacityAction({ quantity: 1, idempotencyKey: "k-billing" });
    expect(res.success).toBe(true);
    // Only AgencyCapacityAddon rows were created — no subscription/invoice rows exist.
    expect(v.addons.filter((a) => a.agencyId === AGENCY_A && a.status === "ACTIVE").length).toBe(1);
  });
});
