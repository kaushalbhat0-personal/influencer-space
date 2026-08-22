/**
 * RCCF-72.18D.7.4 — deployment verification readiness guardrails.
 *
 * D.6.3 deferred two deployment-boundary decisions to this ticket; the audit
 * found BOTH were concrete gaps and closed them with the smallest fail-closed
 * change:
 *
 *   1. scripts/validate-env.mjs did NOT require RAZORPAY_WEBHOOK_SECRET — a
 *      deploy without it passes validation while every webhook delivery 500s
 *      at runtime (all DIRECT_CREATOR reconciliation silently dead).
 *   2. It also did not require NEXT_PUBLIC_RAZORPAY_KEY_ID — PLATFORM_COLLECT
 *      checkout cannot initialize in the browser without it.
 *   3. The validator echoed 12-character PREFIXES of credential values into
 *      deployment logs (key secrets, encryption key). Diagnostics must be
 *      presence-only.
 *
 * Also pinned here (unchanged by design): the webhook route keeps its
 * fail-closed 500 on a missing secret and its timing-safe raw-body HMAC;
 * both commerce strategies stay `active`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("RCCF-72.18D.7.4 — deployment gate guardrails", () => {
  it("validate-env requires the webhook secret AND the public checkout key", () => {
    const script = read("scripts/validate-env.mjs");
    expect(script).toMatch(/"RAZORPAY_WEBHOOK_SECRET"/);
    expect(script).toMatch(/"NEXT_PUBLIC_RAZORPAY_KEY_ID"/);
    // Both live inside the REQUIRED array (fail-closed at deploy time), not WARN.
    const requiredBlock = script.match(/const REQUIRED = \[([\s\S]*?)\];/)?.[1] ?? "";
    expect(requiredBlock).toContain("RAZORPAY_WEBHOOK_SECRET");
    expect(requiredBlock).toContain("NEXT_PUBLIC_RAZORPAY_KEY_ID");
  });

  it("validator stays fail-closed on empty/placeholder values", () => {
    const script = read("scripts/validate-env.mjs");
    // Empty string and the documented placeholder prefix both reject.
    expect(script).toMatch(/value\.startsWith\("your-"\)/);
    expect(script).toMatch(/value === ""/);
    // A required miss must flip the process exit code.
    expect(script).toMatch(/exitCode = 1/);
  });

  it("validator diagnostics are presence-only — never echo credential fragments", () => {
    const script = read("scripts/validate-env.mjs");
    // The old defect: `${value.slice(0, 12)}...` printed secret prefixes.
    expect(script).not.toMatch(/value\.slice\(0,\s*\d+\)/);
    expect(script).not.toMatch(/\$\{value\}/);
    // Presence-only shape survives.
    expect(script).toMatch(/— Set \(\$\{value\.length\} chars\)/);
  });

  it("webhook route still fails closed without a configured secret (500, pre-parse)", () => {
    const route = read("src/app/api/webhooks/razorpay/route.ts");
    // Missing-secret short-circuit BEFORE any parse/mutation.
    expect(route).toMatch(/if \(!webhookSecret\)/);
    expect(route).toMatch(/Webhook secret not configured/, "500 body");
    expect(route).toMatch(/status: 500/);
    // Signature gate unchanged: timing-safe over the RAW body.
    expect(route).toMatch(/createHmac\("sha256", webhookSecret\)\.update\(rawBody\)/);
    expect(route).toMatch(/timingSafeEqual/);
    expect(route).toMatch(/status: 401/);
  });

  it("both commerce strategies remain active for deployment", () => {
    const registry = read("src/modules/commerce-strategy/application/registry.ts");
    const platform = registry.match(/\{\s*id: "PLATFORM_COLLECT",[\s\S]*?status: "(\w+)"/)?.[1];
    const direct = registry.match(/\{\s*id: "DIRECT_CREATOR",[\s\S]*?status: "(\w+)"/)?.[1];
    expect(platform).toBe("active");
    expect(direct).toBe("active");
  });
});
