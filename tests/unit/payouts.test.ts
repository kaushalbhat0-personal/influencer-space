import { describe, it, expect, beforeEach } from "vitest";
import { payoutService, payoutLedger, payoutProviderRegistry, ManualPayoutProvider, validatePayoutStatus, validateProviderType, validateMinorUnits, validateIdempotencyKey, canTransitionStatus, formatPayoutStatus, formatMoney, buildEligibility, aggregateByStatus, PAYOUT_STATUSES, PAYOUT_PROVIDER_TYPES, MIN_PAYOUT_AMOUNT } from "@/lib/payouts";

beforeEach(() => { payoutLedger.clear(); });

describe("Payouts — Constants", () => {
  it("should define payout statuses", () => { expect(PAYOUT_STATUSES).toContain("pending"); });
  it("should define provider types", () => { expect(PAYOUT_PROVIDER_TYPES).toContain("manual"); });
  it("should have minimum payout threshold", () => { expect(MIN_PAYOUT_AMOUNT).toBe(50000); });
});

describe("Payouts — Validation", () => {
  it("should validate payout statuses", () => { expect(validatePayoutStatus("pending")).toBe(true); expect(validatePayoutStatus("unknown")).toBe(false); });
  it("should validate provider types", () => { expect(validateProviderType("manual")).toBe(true); });
  it("should validate minor units", () => { expect(validateMinorUnits(100)).toBe(true); });
  it("should validate idempotency keys", () => { expect(validateIdempotencyKey("key_12345678")).toBe(true); });
  it("should validate status transitions", () => { expect(canTransitionStatus("pending", "reserved")).toBe(true); expect(canTransitionStatus("completed", "pending")).toBe(false); });
});

describe("Payouts — Provider Registry", () => {
  it("should register default providers", () => { expect(payoutProviderRegistry.get("manual")).toBeDefined(); });
  it("should list capabilities", () => { expect(payoutProviderRegistry.listCapabilities().length).toBe(3); });
  it("should check health", async () => { const h = await payoutProviderRegistry.healthCheckAll(); expect(h.manual.ok).toBe(true); });
});

describe("Payouts — Eligibility", () => {
  it("should return eligible when all conditions met", () => { const r = buildEligibility({ partnerId: "p1", availableBalance: 100000, pendingBalance: 50000, totalReserved: 0, hasVerifiedAccount: true, partnerActive: true }); expect(r.eligible).toBe(true); });
  it("should reject when balance below minimum", () => { const r = buildEligibility({ partnerId: "p1", availableBalance: 10000, pendingBalance: 0, totalReserved: 0, hasVerifiedAccount: true, partnerActive: true }); expect(r.eligible).toBe(false); });
});

describe("Payouts — Service", () => {
  it("should create payout batch", () => { const b = payoutService.createPayout({ partnerId: "p1", provider: "manual", currency: "INR", total: 100000, fee: 1000, entryIds: ["ce_1"], idempotencyKey: "idem_12345678", initiatedBy: "admin" }); expect(b).not.toHaveProperty("errors"); expect((b as any).status).toBe("pending"); });
  it("should reject below-minimum payout", () => { const r = payoutService.createPayout({ partnerId: "p1", provider: "manual", currency: "INR", total: 100, fee: 0, entryIds: ["ce_1"], idempotencyKey: "idem_87654321", initiatedBy: "admin" }); expect(r).toHaveProperty("errors"); });
  it("should deduplicate by idempotency key", () => { const a = payoutService.createPayout({ partnerId: "p1", provider: "manual", currency: "INR", total: 100000, fee: 0, entryIds: ["ce_1"], idempotencyKey: "dup_key_12345", initiatedBy: "admin" }) as any; const b = payoutService.createPayout({ partnerId: "p1", provider: "manual", currency: "INR", total: 100000, fee: 0, entryIds: ["ce_1"], idempotencyKey: "dup_key_12345", initiatedBy: "admin" }) as any; expect(a.id).toBe(b.id); });
  it("should cancel a payout", () => { const b = payoutService.createPayout({ partnerId: "p1", provider: "manual", currency: "INR", total: 100000, fee: 0, entryIds: ["ce_1"], idempotencyKey: "cancel_12345", initiatedBy: "admin" }) as any; const c = payoutService.cancelPayout(b.id, "Not needed") as any; expect(c.status).toBe("cancelled"); });
  it("should get batches by partner", () => { payoutService.createPayout({ partnerId: "p1", provider: "manual", currency: "INR", total: 100000, fee: 0, entryIds: ["ce_1"], idempotencyKey: "partner_query_1", initiatedBy: "admin" }); expect(payoutService.getBatchesByPartner("p1").length).toBe(1); });
  it("should get summary", () => { payoutService.createPayout({ partnerId: "p1", provider: "manual", currency: "INR", total: 100000, fee: 5000, entryIds: ["ce_1"], idempotencyKey: "summary_1234", initiatedBy: "admin" }); const s = payoutService.getSummary("p1"); expect(s.totalBatches).toBe(1); expect(s.totalNet).toBe(95000); });
  it("should check eligibility via service", () => { const r = payoutService.checkEligibility({ partnerId: "p1", availableBalance: 100000, pendingBalance: 0, hasVerifiedAccount: true, partnerActive: true }); expect(r.eligible).toBe(true); });
});

describe("Payouts — Formatting", () => {
  it("should format payout status", () => { expect(formatPayoutStatus("pending")).toBe("Pending"); });
  it("should format money", () => { expect(formatMoney(10000)).toBe("₹100.00"); });
  it("should aggregate by status", () => { payoutService.createPayout({ partnerId: "p1", provider: "manual", currency: "INR", total: 100000, fee: 0, entryIds: ["ce_1"], idempotencyKey: "agg_test_1", initiatedBy: "admin" }); const a = aggregateByStatus(payoutService.getAllBatches()); expect(a).toHaveProperty("pending"); });
});
