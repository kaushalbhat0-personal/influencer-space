/**
 * RCCF-72.18D.7.2 — Razorpay Test Mode E2E boundary guardrails.
 *
 * These assertions pin the exact source-level invariants that the D.7.2
 * external Razorpay Test Mode verification exercised end-to-end:
 *
 *   1. Checkout identity chain — server-generated reconciliationRef persisted
 *      on the order AND attached to the Payment Link notes (Razorpay propagates
 *      link notes onto payments — proven live).
 *   2. Provider adapter maps non-Error SDK rejections (the razorpay SDK throws
 *      plain objects from `normalizeError`) to a safe generic message without
 *      leaking internals.
 *   3. Refund execution resolves credentials through the HISTORICAL
 *      order.paymentAccountId, never through a current-account lookup.
 *   4. Webhook signature comparison is timing-safe over the raw body.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("RCCF-72.18D.7.2 test-mode boundary guardrails", () => {
  it("checkout persists an order-unique reconciliationRef and attaches it to link notes", () => {
    const actions = read("src/actions/payment-account.actions.ts");
    // Server-generated per-checkout identity (never client input).
    expect(actions).toMatch(/const reconciliationRef = crypto\.randomUUID\(\)/);
    // Persisted on the order for webhook resolution.
    expect(actions).toMatch(/providerMetadata: \{ checkoutUrl[\s\S]*reconciliationRef \}/);
    // Passed into provider metadata → Payment Link notes.
    expect(actions).toMatch(/metadata: \{ reconciliationRef \}/);

    const provider = read("src/modules/payment-account/providers/razorpay.ts");
    expect(provider).toMatch(/notes: \{/);
    expect(provider).toMatch(/\.\.\.\(input\.order\.metadata \?\? \{\}\)/);
    // Provider reference (plink id) is stored for primary reconciliation.
    expect(actions).toMatch(/providerReference: result\.providerReference/);
  });

  it("adapter never leaks SDK rejection internals to callers", () => {
    const provider = read("src/modules/payment-account/providers/razorpay.ts");
    // The razorpay SDK rejects with plain objects ({statusCode,error}); the
    // adapter must map those to a safe generic string (err.message only for
    // real Error instances).
    expect(provider).toMatch(
      /err instanceof Error \? err\.message : "Razorpay payment link failed"/,
    );
    // No statusCode/error-object fields are surfaced in checkout results.
    expect(provider).not.toMatch(/statusCode[^\n]*return|return[^\n]*statusCode/);
  });

  it("refund executes against the historical order.paymentAccountId binding", () => {
    const actions = read("src/actions/payment-account.actions.ts");
    // The refund path loads the payment account THROUGH the order's stored id…
    expect(actions).toMatch(/paymentAccount\.findUnique\(\{\s*where: \{ id: order\.paymentAccountId/);
    // …validates tenant ownership of that historical account…
    expect(actions).toMatch(/INVALID_PAYMENT_ACCOUNT/);
    // …and refuses anything that is not DIRECT_CREATOR.
    expect(actions).toMatch(/INVALID_STRATEGY/);
  });

  it("webhook HMAC verification stays timing-safe over the raw body", () => {
    const route = read("src/app/api/webhooks/razorpay/route.ts");
    expect(route).toMatch(/createHmac\("sha256", webhookSecret\)\.update\(rawBody\)/);
    expect(route).toMatch(/timingSafeEqual/);
    // Signature failure must be rejected before any JSON parsing/mutation.
    expect(route).toMatch(/Invalid signature/);
  });

  it("D.6.1 reconciliation enforces amount authority and PENDING-only completion", () => {
    const recon = read("src/modules/billing/application/direct-creator-reconciliation.ts");
    expect(recon).toMatch(/amount_mismatch/);
    expect(recon).toMatch(/Math\.round\(order\.amount \* 100\)/);
    expect(recon).toMatch(/status !== "PENDING"/);
    expect(recon).toMatch(/already_completed/);
    // Identity cross-check: both signals must agree or nothing mutates.
    expect(recon).toMatch(/identity mismatch/);
  });
});
