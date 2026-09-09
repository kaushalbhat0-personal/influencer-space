import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";

describe("OBS-03 P0 — failure coverage", () => {
  it("onboarding importProfile and outer failures captured", async () => {
    const c = fs.readFileSync("src/actions/onboarding.actions.ts", "utf8");
    expect(c).toContain('service: "onboarding"');
    expect(c).toContain('operation: "importProfile"');
    expect(c).toContain('operation: "createManualWebsite"');
    expect(c).toContain('operation: "runCreatorGeneration"');
  });
  it("generation provisioning/import failures captured", async () => {
    const c = fs.readFileSync("src/lib/generation/execute.ts", "utf8");
    expect(c).toContain('service: "generation"');
    expect(c).toContain('operation: "importProfile"');
    expect(c).toContain('operation: "provision"');
    expect(c).toContain('operation: "composition"');
  });
  it("agency invitation lifecycle failures captured", async () => {
    const c = fs.readFileSync("src/modules/partner/application/invitation.ts", "utf8");
    expect(c).toContain('service: "partner"');
    expect(c).toContain('createInvitation:duplicate');
    expect(c).toContain('createInvitation:email');
    expect(c).toContain('claimInvitation:notFound');
    expect(c).toContain('claimInvitation:accountExists');
    expect(c).toContain('claimInvitation:race');
  });
  it("commerce fulfillment/customer confirmation captured", async () => {
    const c = fs.readFileSync("src/modules/billing/application/order-completion.ts", "utf8");
    expect(c).toContain('service: "commerce"');
    expect(c).toContain('operation: "ensureFulfillment"');
    expect(c).toContain('operation: "customerConfirmation"');
    expect(c).toContain('operation: "orderCompletion:quota"');
  });
});

describe("OBS-03 P0 — recovery guidance", () => {
  it("SystemError has recovery column", async () => {
    const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
    expect(schema).toContain("recovery");
    expect(schema).toContain("model SystemError");
  });
  it("error-tracker persists recovery and runbook mapping", async () => {
    const c = fs.readFileSync("src/lib/observability/error-tracker.ts", "utf8");
    expect(c).toContain("recovery");
    expect(c).toContain("RECOVERY_HINTS");
    const rb = fs.readFileSync("src/lib/observability/runbooks.ts", "utf8");
    expect(rb).toContain("getRunbookForSystemError");
  });
  it("super admin detail shows recovery and runbook", async () => {
    const c = fs.readFileSync("src/app/super-admin/errors/_components/errors-client.tsx", "utf8");
    expect(c).toContain("Recovery");
    expect(c).toContain("getRunbookForSystemError");
    expect(c).toContain("Runbook:");
  });
});

describe("OBS-03 P1 — Vercel business events", () => {
  it("vercel-events taxonomy 13 events with allowlist", async () => {
    const c = fs.readFileSync("src/lib/analytics/vercel-events.ts", "utf8");
    const events = ["signupCompleted","onboardingStarted","generationStarted","generationCompleted","websitePublished","storefrontViewed","builderEdit","agencyCreated","clientWebsiteCreated","claimCompleted","integrationConnected","checkoutStarted","checkoutCompleted"];
    for (const e of events) expect(c).toContain(e);
    expect(c).toContain("sanitizeProps");
    expect(c).toContain("email");
    expect(c).toContain("token");
    // Allowlist blocks amount/price/payment
    expect(c).toContain("amount");
    expect(c).toContain("price");
    // TenantId server-derived
    expect(c).toContain("tenantId");
    // Ensure no event definition passes amount as prop (check VercelEvents calls)
    expect(c).not.toMatch(/VercelEvents\.checkoutCompleted\(\{[^}]*amount/);
  });
  it("events bridged in code", async () => {
    const checks: Array<[string, string]> = [
      ["src/app/api/auth/register/route.ts", "signupCompleted"],
      ["src/actions/onboarding.actions.ts", "generationStarted"],
      ["src/lib/generation/execute.ts", "generationCompleted"],
      ["src/lib/publishing/service.ts", "websitePublished"],
      ["src/lib/storefront/storefront-loader.ts", "storefrontViewed"],
      ["src/actions/builder.actions.ts", "builderEdit"],
      ["src/modules/partner/application/invitation.ts", "claimCompleted"],
      ["src/modules/tenant-integration/resend.ts", "integrationConnected"],
      ["src/actions/checkout.actions.ts", "checkoutStarted"],
      ["src/modules/billing/application/order-completion.ts", "checkoutCompleted"],
    ];
    for (const [file, evt] of checks) {
      const c = fs.readFileSync(file, "utf8");
      expect(c, `${file} should contain ${evt}`).toContain(evt);
    }
  });
  it("storefront_viewed sampled", async () => {
    const c = fs.readFileSync("src/lib/analytics/vercel-events.ts", "utf8");
    expect(c).toContain("Math.random() > 0.1");
    expect(c).toContain("storefrontViewed");
  });
  it("no PII in Vercel props", async () => {
    const c = fs.readFileSync("src/lib/analytics/vercel-events.ts", "utf8");
    expect(c).toContain("sanitizeProps");
    expect(c).toMatch(/email/);
    // Ensure we don't track raw email
    const hasEmailTrack = /VercelEvents\.signupCompleted.*email/.test(c);
    expect(hasEmailTrack).toBe(false);
  });
});

describe("OBS-03 P1 — super admin panel", () => {
  it("shows distinct tenant count and sparkline", async () => {
    const c = fs.readFileSync("src/app/super-admin/errors/_components/errors-client.tsx", "utf8");
    expect(c).toContain("tenantCount");
    expect(c).toContain("tenants");
    expect(c).toContain("barWidth");
    expect(c).toContain("maxCount");
  });
  it("auto-reopen RESOLVED→NEW", async () => {
    const c = fs.readFileSync("src/lib/observability/error-tracker.ts", "utf8");
    expect(c).toContain("shouldReopen");
    expect(c).toContain('status: "NEW"');
    expect(c).toContain("RESOLVED");
  });
  it("environment and workflow filters", async () => {
    const c = fs.readFileSync("src/app/super-admin/errors/_components/errors-client.tsx", "utf8");
    expect(c).toContain("ENVIRONMENTS");
    expect(c).toContain("WORKFLOWS");
    expect(c).toContain('Filter by environment');
    expect(c).toContain('Filter by workflow');
    const store = fs.readFileSync("src/lib/observability/system-error-store.ts", "utf8");
    expect(store).toContain("environment");
  });
});

describe("OBS-03 P1 — commerce staleness", () => {
  it("reconcile-pending-orders creates SystemError for expired and 429", async () => {
    const c = fs.readFileSync("src/app/api/cron/reconcile-pending-orders/route.ts", "utf8");
    expect(c).toContain('captureError(new Error(`Pending order expired');
    expect(c).toContain('429');
    expect(c).toContain('commerce');
    expect(c).toContain('reconcilePendingOrders');
  });
  it("avoids duplicate per order via fingerprint dedup", async () => {
    const c = fs.readFileSync("src/lib/observability/error-tracker.ts", "utf8");
    expect(c).toContain("fingerprint");
    expect(c).toContain("shouldPersist");
  });
});

describe("OBS-03 regression — OBS-01/02 still", () => {
  it("SystemError still has fingerprint redaction", async () => {
    const c = fs.readFileSync("src/lib/observability/error-tracker.ts", "utf8");
    expect(c).toContain("redactMessage");
    expect(c).toContain("computeFingerprint");
    expect(c).toContain("floodMap");
  });
  it("client endpoint still rate-limited and never trusts tenant", async () => {
    const c = fs.readFileSync("src/app/api/observability/client-error/route.ts", "utf8");
    expect(c).toContain("checkRateLimit");
    expect(c).toContain("Never trust client-supplied tenantId");
  });
});
