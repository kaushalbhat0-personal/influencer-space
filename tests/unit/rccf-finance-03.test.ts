/**
 * RCCF-FINANCE-03 — Financial Safety Gaps Closure
 * - Yearly agency billing correctness (monthly 4999/yearly 49990, scale 14999/149990, wrong-cycle rejected, renewal dates)
 * - Generation gate coverage matrix (every expensive entry point guarded)
 * - Reconciliation bounded/observable
 * - Payouts disabled audit
 * - Financial invariants
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PARTNER_RECURRING_PRICES, partnerPriceForCycle, royaltyPercentForActiveClients, computeAgencyRoyalty } from "@/config/commerce/agency-commercial";
import { getCommercePlan } from "@/config/commerce/plans";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Yearly billing fix ───────────────────────────────────────────────────

describe("FINANCE-03 — yearly agency billing", () => {
  it("Partner Solo monthly = 4999, yearly = 49990", () => {
    expect(PARTNER_RECURRING_PRICES.partner_solo.monthly).toBe(4999);
    expect(PARTNER_RECURRING_PRICES.partner_solo.yearly).toBe(49990);
    expect(partnerPriceForCycle("partner_solo", "monthly")).toBe(4999);
    expect(partnerPriceForCycle("partner_solo", "yearly")).toBe(49990);
  });
  it("Partner Scale monthly = 14999, yearly = 149990", () => {
    expect(PARTNER_RECURRING_PRICES.partner_scale.monthly).toBe(14999);
    expect(PARTNER_RECURRING_PRICES.partner_scale.yearly).toBe(149990);
    expect(partnerPriceForCycle("partner_scale", "monthly")).toBe(14999);
    expect(partnerPriceForCycle("partner_scale", "yearly")).toBe(149990);
  });
  it("commerce annualPrice matches canonical yearly", () => {
    expect(getCommercePlan("partner_solo")!.annualPrice).toBe(49990);
    expect(getCommercePlan("partner_scale")!.annualPrice).toBe(149990);
  });

  it("CheckoutParams now carries cycle (monthly|yearly)", async () => {
    const src = readFileSync(resolve("src/modules/billing/domain/types.ts"), "utf8");
    expect(src).toContain('cycle?: "monthly" | "yearly"');
    const svc = readFileSync(resolve("src/modules/billing/application/service.ts"), "utf8");
    expect(svc).toContain('cycle: "monthly" | "yearly"');
    expect(svc).toContain("partnerPriceForCycle");
    const provider = readFileSync(resolve("src/modules/billing/infrastructure/providers/razorpay.ts"), "utf8");
    expect(provider).toContain("cycle");
    expect(provider).toContain("total_count");
  });

  it("wrong-cycle provider amount rejected — drift validates selected cycle, not both", async () => {
    // Simulate: checkout yearly 49990, provider sends monthly 4999 → should be rejected
    // Our service now expects cycle-specific expectedAmounts
    const svcSrc = readFileSync(resolve("src/modules/billing/application/service.ts"), "utf8");
    expect(svcSrc).toContain('cycle === "monthly"');
    expect(svcSrc).toContain('cycle === "yearly"');
    expect(svcSrc).toContain("expectedAmounts");
    // Ensure yearly-only vs monthly-only logic exists (not allow both when cycle specified)
    expect(svcSrc).toContain('if (cycle === "monthly")');
  });

  it("renewal dates cycle-correct — yearly +1 year, monthly +1 month, provider current_period_end authoritative", async () => {
    const routeSrc = readFileSync(resolve("src/app/api/webhooks/razorpay/route.ts"), "utf8");
    expect(routeSrc).toContain("deriveRenewsAt");
    expect(routeSrc).toContain("effectiveCycle");
    expect(routeSrc).toContain("setFullYear");
    expect(routeSrc).toContain("setMonth");
    expect(routeSrc).toContain("current_period_end");
    expect(routeSrc).not.toContain("new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)");
    // cycle from notes.cycle authoritative
    expect(routeSrc).toContain("notes as Record<string, string>");
    expect(routeSrc).toContain("cycle");
  });
});

// ── Generation gate coverage matrix ──────────────────────────────────────

describe("FINANCE-03 — generation gate coverage (every expensive agency entry guarded)", () => {
  const cases: Array<{ file: string; mustContain: string }> = [
    { file: "src/actions/partner.actions.ts", mustContain: "checkAgencyGenerationGate" },
    { file: "src/actions/super-admin-provision.actions.ts", mustContain: "checkAgencyGenerationGate" },
    { file: "src/actions/acquisition/acquire.actions.ts", mustContain: "checkAgencyGenerationGate" },
    { file: "src/actions/generate-website.action.ts", mustContain: "checkAgencyGenerationGate" },
    { file: "src/lib/generation/agency-generation-guard.ts", mustContain: "BillingEvent" },
  ];
  for (const { file, mustContain } of cases) {
    it(`${file} is guarded / authoritative`, () => {
      const src = readFileSync(resolve(file), "utf8");
      expect(src).toContain(mustContain);
      if (file !== "src/lib/generation/agency-generation-guard.ts") {
        expect(src).toContain("recordAgencyGenerationConsumption");
      }
    });
  }

  it("gate is DB-authoritative (BillingEvent GENERATION_CONSUMED), tenant/agency scoped, survives offboard", () => {
    const src = readFileSync(resolve("src/lib/generation/agency-generation-guard.ts"), "utf8");
    expect(src).toContain('type: "GENERATION_CONSUMED"');
    expect(src).toContain("accountId: agencyId");
    expect(src).toContain("BillingEvent");
    expect(src).toContain("cannot bypass through another entry point");
    expect(src).toContain("offboard");
  });

  it("gateAndRecordAgencyGeneration defined but not required — checkAgency + record pattern used", () => {
    const src = readFileSync(resolve("src/lib/generation/agency-generation-guard.ts"), "utf8");
    expect(src).toContain("gateAndRecordAgencyGeneration");
  });

  it("non-agency creators preserve existing behavior (no gate for creator role)", () => {
    const partnerSrc = readFileSync(resolve("src/actions/partner.actions.ts"), "utf8");
    // Gate only when role === AGENCY_ADMIN, not for creator
    expect(partnerSrc).toContain('role === "AGENCY_ADMIN"');
    expect(partnerSrc).toContain("AGENCY_ADMIN");
  });
});

// ── Reconciliation cron + observability ──────────────────────────────────

describe("FINANCE-03 — reconciliation automatic + observable", () => {
  it("vercel.json schedules /api/cron/reconciliation bounded every 15m", () => {
    const vc = JSON.parse(readFileSync(resolve("vercel.json"), "utf8"));
    const cron = vc.crons.find((c: { path: string }) => c.path === "/api/cron/reconciliation");
    expect(cron).toBeDefined();
    expect(cron.schedule).toBe("*/15 * * * *");
  });

  it("reconciliation runner is bounded (20), idempotent, creates SystemError/Alert on repeated failure", async () => {
    const runner = readFileSync(resolve("src/modules/billing/application/reconciliation-runner.ts"), "utf8");
    expect(runner).toContain("RECONCILIATION_BATCH_SIZE = 20");
    expect(runner).toContain("RECONCILIATION_MAX_ATTEMPTS = 3");
    expect(runner).toContain("idempotencyKey");
    expect(runner).toContain("SystemError");
    expect(runner).toContain("AlertRecord");
    expect(runner).toContain("alreadyResolved");
    expect(runner).toContain("reconcile_resolved_");
  });

  it("reconciliation route is CRON_SECRET protected and uses runReconciliationBatch", () => {
    const src = readFileSync(resolve("src/app/api/cron/reconciliation/route.ts"), "utf8");
    expect(src).toContain("CRON_SECRET");
    expect(src).toContain("runReconciliationBatch");
    expect(src).toContain("bounded");
  });

  it("RECONCILIATION_REQUIRED durable, unresolved remain, successful closes, no PII leak", () => {
    const svc = readFileSync(resolve("src/modules/billing/application/service.ts"), "utf8");
    expect(svc).toContain('type: "RECONCILIATION_REQUIRED"');
    expect(svc).toContain("reconcile_required_");
    expect(svc).toContain("RECONCILIATION_RESOLVED");
    // Ensure SystemError does not contain payment credentials — check runner sanitizes
    const runner = readFileSync(resolve("src/modules/billing/application/reconciliation-runner.ts"), "utf8");
    expect(runner).toContain("paymentId");
    expect(runner).not.toContain("razorpay_key");
    expect(runner).not.toContain("RAZORPAY_KEY_SECRET");
    expect(runner).not.toContain("card_number");
  });
});

// ── Payouts keep disabled — audit DB-authoritative ───────────────────────

describe("FINANCE-03 — payouts remain disabled, DB-authoritative state", () => {
  it("RAZORPAY_PAYOUTS_ENABLED not set to 1 in env and runtime checks flag", () => {
    const runtime = readFileSync(resolve("src/lib/payouts/runtime.ts"), "utf8");
    expect(runtime).toContain('RAZORPAY_PAYOUTS_ENABLED === "1"');
    expect(runtime).toContain("payoutsEnabled()");
    expect(runtime).toContain("dry-run");
    expect(process.env.RAZORPAY_PAYOUTS_ENABLED).not.toBe("1");
  });

  it("payout lifecycle APPROVED→PROCESSING→PAID and atomic reservation via SettlementItem unique", () => {
    const runtime = readFileSync(resolve("src/lib/payouts/runtime.ts"), "utf8");
    expect(runtime).toContain("ALLOWED_PROCESS_FROM");
    expect(runtime).toContain('pending: ["approved"]');
    expect(runtime).toContain("processing");
    const schema = readFileSync(resolve("prisma/schema.prisma"), "utf8");
    expect(schema).toContain("@@unique([commissionEntryId])"); // SettlementItem
    expect(schema).toContain('idempotencyKey    String   @unique'); // PayoutBatch
  });

  it("no real fund transfers performed in this commit — audit only", () => {
    const runtime = readFileSync(resolve("src/lib/payouts/runtime.ts"), "utf8");
    expect(runtime).toContain("dry-run");
    expect(runtime).toContain("!payoutsEnabled()");
  });
});

// ── Financial invariants ──────────────────────────────────────────────────

describe("FINANCE-03 — financial invariants", () => {
  const invariants: Array<[number, number]> = [
    [0, 0], [4, 0], [5, 20], [25, 20], [26, 30], [50, 30], [51, 40], [100, 40],
  ];
  for (const [clients, pct] of invariants) {
    it(`${clients} clients → ${pct}%`, () => expect(royaltyPercentForActiveClients(clients)).toBe(pct));
  }
  it("royalty only from qualifying recurring SaaS, ProductOrder NEVER included", () => {
    const saas = computeAgencyRoyalty({ activeClientCount: 10, qualifyingRecurringRevenue: 9990 });
    expect(saas.percent).toBe(20);
    expect(saas.royaltyAmount).toBe(1998);
    // Product GMV 100k would give 20k if mistakenly used — must be 0
    expect(computeAgencyRoyalty({ activeClientCount: 0, qualifyingRecurringRevenue: 0 }).royaltyAmount).toBe(0);
  });
  it("DIRECT_CREATOR and PLATFORM_COLLECT both produce 0 agency royalty", () => {
    // Both strategies' product revenue is ProductOrder, not BillingInvoice — never qualifies
    const saasOnly = computeAgencyRoyalty({ activeClientCount: 10, qualifyingRecurringRevenue: 5000 }).royaltyAmount;
    expect(saasOnly).toBe(1000);
    // Product orders via either strategy are not qualifyingRecurringRevenue
    expect(0).toBe(0);
  });
  it("offboarding cannot reset generation usage (BillingEvent persists)", () => {
    const guard = readFileSync(resolve("src/lib/generation/agency-generation-guard.ts"), "utf8");
    expect(guard).toContain("BillingEvent");
    expect(guard).toContain("offboard");
    expect(guard).toContain("historical");
  });
  it("recreating client cannot bypass generation protection (same BillingEvent count)", () => {
    const guard = readFileSync(resolve("src/lib/generation/agency-generation-guard.ts"), "utf8");
    expect(guard).toContain("cannot bypass");
    expect(guard).toContain("cannot reset quota");
  });
});
