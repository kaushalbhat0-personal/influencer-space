import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared in-memory AgencyTenant "table" + a serializing $transaction queue that
// faithfully models the FOR UPDATE row-lock (concurrent client creations run
// one-at-a-time; the second sees the committed count).
const h = vi.hoisted(() => {
  const links: Array<{ agencyId: string; tenantId: string; status: string }> = [];
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = (cb: () => unknown) => {
    const run = queue.then(cb);
    queue = run.catch(() => {});
    return run;
  };
  return {
    mockResolveActivePlan: vi.fn(),
    mockAgencyFindUnique: vi.fn(),
    mockWorkspaceFindUnique: vi.fn(),
    mockAgencyTenantFindUnique: vi.fn(),
    mockLogAction: vi.fn(),
    links,
    resetLinks: () => { links.length = 0; },
    resetQueue: () => { queue = Promise.resolve(); },
    serialize,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    websiteAgency: { findUnique: h.mockAgencyFindUnique },
    workspace: { findUnique: h.mockWorkspaceFindUnique },
    billingSubscription: { findFirst: async () => ({ status: "TRIALING", trialEndsAt: new Date(Date.now() + 86400000) }) },
    agencyCapacityAddon: { aggregate: async () => ({ _sum: { quantity: null } }) },
    agencyTenant: {
      findUnique: h.mockAgencyTenantFindUnique,
      count: async ({ where }: { where: { agencyId: string; status: string } }) =>
        h.links.filter((l) => l.agencyId === where.agencyId && l.status === where.status).length,
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: (cb: (tx: unknown) => unknown) => h.serialize(() => cb({
      $queryRaw: async () => {},
      agencyTenant: {
        count: async ({ where }: { where: { agencyId: string; status: string } }) =>
          h.links.filter((l) => l.agencyId === where.agencyId && l.status === where.status).length,
        create: async ({ data }: { data: { agencyId: string; tenantId: string; status: string } }) => {
          h.links.push({ agencyId: data.agencyId, tenantId: data.tenantId, status: data.status });
          return { id: `at-${data.tenantId}` };
        },
      },
    })),
  },
}));

vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: h.mockResolveActivePlan }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));

import { agencyTenantRelationship, getAgencyClientCapacity, ClientCapacityError } from "@/modules/partner/application/partner-relationship";
import { applyRuntimeFeatureOverrides, resetRuntimeFeatureOverrides } from "@/lib/capabilities/plans";
import { capabilityService } from "@/lib/capabilities";

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function tenantId(n: number) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.resetLinks();
  h.resetQueue();
  h.mockAgencyFindUnique.mockResolvedValue({ status: "ACTIVE" });
  h.mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-a" });
  h.mockAgencyTenantFindUnique.mockResolvedValue(null);
  h.mockLogAction.mockResolvedValue(undefined);
  resetRuntimeFeatureOverrides();
});

describe("RCCF-40 — canonical partner max_clients defaults", () => {
  it("partner_free 1, partner_solo 5, partner_scale 15, partner_enterprise -1", () => {
    expect(capabilityService.limit("partner_free", "max_clients")).toBe(1);
    expect(capabilityService.limit("partner_solo", "max_clients")).toBe(5);
    expect(capabilityService.limit("partner_scale", "max_clients")).toBe(15);
    expect(capabilityService.limit("partner_enterprise", "max_clients")).toBe(-1);
  });
});

describe("RCCF-40 — client capacity enforcement at linkCreator", () => {
  it("Partner Launch allows client #1 and rejects client #2", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_free", origin: "v2", status: "TRIALING" });

    await expect(agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(1) })).resolves.toMatchObject({ linked: true });
    await expect(agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(2) })).rejects.toThrow(ClientCapacityError);

    expect(h.links.length).toBe(1);
  });

  it("Solo Partner allows client #5 and rejects client #6", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
    for (let i = 1; i <= 5; i++) await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(i) });

    await expect(agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(6) })).rejects.toThrow(ClientCapacityError);
    expect(h.links.length).toBe(5);
  });

  it("Partner Scale allows client #15 and rejects client #16", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_scale", origin: "v2", status: "ACTIVE" });
    for (let i = 1; i <= 15; i++) await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(i) });

    await expect(agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(16) })).rejects.toThrow(ClientCapacityError);
    expect(h.links.length).toBe(15);
  });

  it("Enterprise (-1) is unlimited — no capacity rejection", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_enterprise", origin: "v2", status: "ACTIVE" });
    for (let i = 1; i <= 25; i++) await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(i) });

    expect(h.links.length).toBe(25);
  });

  it("a missing/unknown subscription does not grant a privileged plan (falls back to Launch)", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: null, origin: "none", status: null });
    await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(1) });
    await expect(agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(2) })).rejects.toThrow(ClientCapacityError);
  });

  it("re-linking an existing client does NOT consume new capacity (idempotent)", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_free", origin: "v2", status: "TRIALING" });
    await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(1) });

    h.mockAgencyTenantFindUnique.mockResolvedValue({
      id: "at-1", agencyId: AGENCY_A, tenantId: tenantId(1), workspaceId: null, status: "ACTIVE",
    });
    const r = await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(1) });
    expect(r.linked).toBe(true);
    expect(h.links.length).toBe(1);
  });
});

describe("RCCF-40 — concurrency: final-slot atomicity", () => {
  it("limit=5, used=4, two concurrent creates → exactly one succeeds, count=5 (never 6)", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
    for (let i = 1; i <= 4; i++) await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(i) });

    const results = await Promise.allSettled([
      agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(5) }),
      agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(6) }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected").length;
    expect(fulfilled).toBe(1);
    expect(rejected).toBe(1);
    expect(h.links.length).toBe(5);
  });
});

describe("RCCF-40 — runtime override propagates to enforcement", () => {
  it("Super Admin reduces Solo max_clients to 3 → enforcement blocks at 3", async () => {
    applyRuntimeFeatureOverrides("partner_solo", { max_clients: 3 });
    expect(capabilityService.limit("partner_solo", "max_clients")).toBe(3);
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });

    await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(1) });
    await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(2) });
    await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(3) });
    await expect(agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(4) })).rejects.toThrow(ClientCapacityError);
    expect(h.links.length).toBe(3);
  });

  it("restoring the override back to 5 re-allows new clients (existing clients remain)", async () => {
    applyRuntimeFeatureOverrides("partner_solo", { max_clients: 3 });
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
    for (let i = 1; i <= 3; i++) await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(i) });

    resetRuntimeFeatureOverrides(); // back to canonical 5
    expect(capabilityService.limit("partner_solo", "max_clients")).toBe(5);
    await expect(agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(4) })).resolves.toMatchObject({ linked: true });
    expect(h.links.length).toBe(4);
  });
});

describe("RCCF-40 — tenant isolation + fail-fast read", () => {
  it("Partner A cannot consume Partner B's capacity", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
    // A creates 2 of its 5 clients.
    await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(1) });
    await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(2) });

    // B has its own independent capacity and can create its own clients.
    h.mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-b" });
    await expect(agencyTenantRelationship.linkCreator({ agencyId: AGENCY_B, tenantId: tenantId(3) })).resolves.toMatchObject({ linked: true });
    expect(h.links.filter((l) => l.agencyId === AGENCY_B).length).toBe(1);
    expect(h.links.filter((l) => l.agencyId === AGENCY_A).length).toBe(2);
  });

  it("getAgencyClientCapacity reports server-resolved plan/limit/used", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
    await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: tenantId(1) });

    const c = await getAgencyClientCapacity(AGENCY_A);
    expect(c).toEqual({ planCode: "partner_solo", limit: 5, used: 1, includedLimit: 5, addonQuantity: 0, trialExpired: false });
  });
});
