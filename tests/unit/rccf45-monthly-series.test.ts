import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => {
  const entries: Array<Record<string, unknown>> = [];
  return {
    entries,
    reset: () => entries.length = 0,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    commissionEntry: {
      findMany: async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, unknown> }) => {
        const partnerId = where.partnerId as string | undefined;
        const rows = h.entries
          .filter((e) => !partnerId || e.partnerId === partnerId)
          .map((e) => ({ createdAt: e.createdAt, partnerShare: e.partnerShare, entryType: e.entryType }));
        return select ? rows : rows;
      },
    },
  },
}));

import { getAgencyMonthlySeries } from "@/modules/partner/application/financial-overview";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// "now" = 2026-08-15 UTC → the 6-month window is 2026-03..2026-08.
function useNow() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-15T00:00:00Z"));
}
beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  useNow();
});
afterEach(() => vi.useRealTimers());

function entry(partnerId: string, month: string, partnerShare: number, entryType: string, id = "") {
  h.entries.push({ id, partnerId, partnerShare, entryType, createdAt: new Date(`${month}-10T00:00:00Z`) });
}

describe("RCCF-45 — monthly financial time-series", () => {
  it("aggregates gross/refunds/net per UTC month", async () => {
    entry(A, "2026-08", 300, "subscription_created");
    entry(A, "2026-08", -120, "refund_reversal");
    entry(A, "2026-07", 100, "subscription_created");

    const s = await getAgencyMonthlySeries(A);

    const aug = s.find((m) => m.month === "2026-08")!;
    const jul = s.find((m) => m.month === "2026-07")!;
    expect(aug).toEqual({ month: "2026-08", gross: 300, refunds: -120, net: 180 });
    expect(jul).toEqual({ month: "2026-07", gross: 100, refunds: 0, net: 100 });
    // Empty months are present and zero.
    expect(s.find((m) => m.month === "2026-03")).toEqual({ month: "2026-03", gross: 0, refunds: 0, net: 0 });
    // Full window returned (6 months).
    expect(s).toHaveLength(6);
  });

  it("full refund → net 0 in that month", async () => {
    entry(A, "2026-08", 300, "subscription_created");
    entry(A, "2026-08", -300, "refund_reversal");

    const aug = (await getAgencyMonthlySeries(A)).find((m) => m.month === "2026-08")!;
    expect(aug).toEqual({ month: "2026-08", gross: 300, refunds: -300, net: 0 });
  });

  it("multiple partial refunds are summed (not double-counted)", async () => {
    entry(A, "2026-08", 300, "subscription_created");
    entry(A, "2026-08", -60, "refund_reversal");
    entry(A, "2026-08", -30, "refund_reversal");

    const aug = (await getAgencyMonthlySeries(A)).find((m) => m.month === "2026-08")!;
    expect(aug).toEqual({ month: "2026-08", gross: 300, refunds: -90, net: 210 });
  });

  it("refunds attribute to the reversal's own month, not the original's", async () => {
    entry(A, "2026-07", 300, "subscription_created"); // original commission in July
    entry(A, "2026-08", -120, "refund_reversal");     // refund processed in August

    const s = await getAgencyMonthlySeries(A);
    expect(s.find((m) => m.month === "2026-07")).toMatchObject({ gross: 300, refunds: 0, net: 300 });
    expect(s.find((m) => m.month === "2026-08")).toMatchObject({ gross: 0, refunds: -120, net: -120 });
  });

  it("Partner A and Partner B are isolated", async () => {
    entry(A, "2026-08", 300, "subscription_created");
    entry(B, "2026-08", 500, "subscription_created");

    const a = await getAgencyMonthlySeries(A);
    const b = await getAgencyMonthlySeries(B);

    expect(a.find((m) => m.month === "2026-08")!.gross).toBe(300);
    expect(b.find((m) => m.month === "2026-08")!.gross).toBe(500);
  });

  it("empty window returns truthful zero months", async () => {
    const s = await getAgencyMonthlySeries(A);
    expect(s).toHaveLength(6);
    expect(s.every((m) => m.gross === 0 && m.refunds === 0 && m.net === 0)).toBe(true);
  });
});
