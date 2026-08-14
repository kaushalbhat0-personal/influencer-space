import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared AgencyTenant state supporting both atomic capacity (linkCreator) and
// offboarding (status → REVOKED), with a serializing $transaction (row lock).
const h = vi.hoisted(() => {
  const links: Array<{ id: string; agencyId: string; tenantId: string; status: string }> = [];
  let seq = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = (cb: () => unknown) => {
    const run = queue.then(cb);
    queue = run.catch(() => {});
    return run;
  };
  const activeCount = (agencyId: string) => links.filter((l) => l.agencyId === agencyId && l.status === "ACTIVE").length;
  return {
    mockResolveActivePlan: vi.fn(),
    mockAgencyFindUnique: vi.fn(),
    mockWorkspaceFindUnique: vi.fn(),
    mockAgencyTenantFindUnique: vi.fn(),
    mockLogAction: vi.fn(),
    links,
    activeCount,
    add: (agencyId: string, tenantId: string) => {
      seq += 1;
      links.push({ id: `rel-${seq}`, agencyId, tenantId, status: "ACTIVE" });
      return `rel-${seq}`;
    },
    reset: () => { links.length = 0; seq = 0; queue = Promise.resolve(); },
    serialize,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    websiteAgency: { findUnique: h.mockAgencyFindUnique },
    workspace: { findUnique: h.mockWorkspaceFindUnique },
    agencyTenant: {
      findUnique: h.mockAgencyTenantFindUnique,
      count: async ({ where }: { where: { agencyId: string; status: string } }) => h.activeCount(where.agencyId),
      update: async ({ where, data }: { where: { id: string }; data: { status?: string; offboardedAt?: Date } }) => {
        const link = h.links.find((l) => l.id === where.id)!;
        if (data.status) link.status = data.status;
        if (data.offboardedAt) (link as Record<string, unknown>).offboardedAt = data.offboardedAt;
        return link;
      },
    },
    $transaction: (cb: (tx: unknown) => unknown) => h.serialize(() => cb({
      $queryRaw: async () => {},
      agencyTenant: {
        count: async ({ where }: { where: { agencyId: string; status: string } }) => h.activeCount(where.agencyId),
        create: async ({ data }: { data: { agencyId: string; tenantId: string; status: string } }) => {
          const id = h.add(data.agencyId, data.tenantId);
          return { id };
        },
      },
    })),
  },
}));

vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: h.mockResolveActivePlan }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));

import { agencyTenantRelationship } from "@/modules/partner/application/partner-relationship";

const AGENCY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const t = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" }); // limit 5
  h.mockAgencyFindUnique.mockResolvedValue({ status: "ACTIVE" });
  h.mockWorkspaceFindUnique.mockResolvedValue({ id: "ws" });
  h.mockAgencyTenantFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    h.links.find((l) => l.id === where.id) ?? null,
  );
  h.mockLogAction.mockResolvedValue(undefined);
});

describe("RCCF-42 — offboarding reclaims capacity atomically", () => {
  it("offboarding one of 5 active clients frees a slot for a new client", async () => {
    for (let i = 1; i <= 5; i++) h.add(AGENCY, t(i));
    expect(h.activeCount(AGENCY)).toBe(5);

    const relId = h.links[0].id;
    const off = await agencyTenantRelationship.offboard(relId, AGENCY);
    expect(off.success).toBe(true);
    expect(h.activeCount(AGENCY)).toBe(4);

    // Capacity reclaimed → a new client can be provisioned (limit 5).
    const created = await agencyTenantRelationship.linkCreator({ agencyId: AGENCY, tenantId: t(6) });
    expect(created.linked).toBe(true);
    expect(h.activeCount(AGENCY)).toBe(5);
  });

  it("an offboarded relationship never counts toward capacity", async () => {
    const relId = h.add(AGENCY, t(1));
    await agencyTenantRelationship.offboard(relId, AGENCY);
    const cap = h.activeCount(AGENCY);
    expect(cap).toBe(0);
  });

  it("concurrent offboard + create at the capacity boundary never exceeds the limit", async () => {
    for (let i = 1; i <= 4; i++) h.add(AGENCY, t(i));
    const relId = h.links[0].id;

    const results = await Promise.allSettled([
      agencyTenantRelationship.offboard(relId, AGENCY),
      agencyTenantRelationship.linkCreator({ agencyId: AGENCY, tenantId: t(5) }),
    ]);
    // Exactly one client addition succeeds at the 5th slot (offboard frees one);
    // both operations may complete, but the ACTIVE count must stay ≤ 5.
    expect(h.activeCount(AGENCY)).toBeLessThanOrEqual(5);
    const created = results.filter((r) => r.status === "fulfilled" && (r.value as { linked?: boolean })?.linked).length;
    expect(created).toBe(1);
  });
});
