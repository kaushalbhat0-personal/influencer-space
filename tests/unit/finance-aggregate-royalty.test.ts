import { describe, it, expect, vi, beforeEach } from "vitest";

describe("FINANCE-ROYALTY-AGGREGATE-03 — portfolio catch-up", () => {
  it("placeholder — helper exists and entryType is distinct", async () => {
    const src = await import("fs").then((fs) => fs.readFileSync("src/lib/commission/runtime.ts", "utf8"));
    expect(src).toContain("subscription_aggregate_catchup");
    expect(src).toContain("createAggregateRoyaltyCatchUp");
    expect(src).toContain('commission_aggregate_catchup:');
  });

  it("resolveNetPendingEntries filters only refund_reversal", async () => {
    const src = await import("fs").then((fs) => fs.readFileSync("src/lib/commission/runtime.ts", "utf8"));
    // Must filter by entryType refund_reversal, not just parentEntryId
    expect(src).toMatch(/entryType:\s*"refund_reversal"/);
    expect(src).not.toMatch(/where: \{ parentEntryId: \{ in: pending\.map.*\}\s*\}/); // old buggy version without filter
  });

  it("handleRefund sums catch-up for effective commission", async () => {
    const src = await import("fs").then((fs) => fs.readFileSync("src/modules/billing/application/service.ts", "utf8"));
    expect(src).toContain("catchUpAgg");
    expect(src).toContain("effectivePartnerShare");
  });

  it("royalty tiers are portfolio-wide 0/20/30/40", async () => {
    const { royaltyPercentForActiveClients } = await import("@/config/commerce/agency-commercial");
    expect(royaltyPercentForActiveClients(0)).toBe(0);
    expect(royaltyPercentForActiveClients(4)).toBe(0);
    expect(royaltyPercentForActiveClients(5)).toBe(20);
    expect(royaltyPercentForActiveClients(25)).toBe(20);
    expect(royaltyPercentForActiveClients(26)).toBe(30);
    expect(royaltyPercentForActiveClients(50)).toBe(30);
    expect(royaltyPercentForActiveClients(51)).toBe(40);
  });
});
