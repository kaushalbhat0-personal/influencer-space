#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Validates all required environment variables are set before deployment.
 * Run: node scripts/validate-env.mjs
 */

const REQUIRED = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "TOKEN_ENCRYPTION_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  // RCCF-72.18D.7.4 — D.6.3 deferred these two to the activation/deployment
  // boundary (this ticket). Both fail closed at runtime already:
  //   - missing webhook secret → /api/webhooks/razorpay answers 500 and never
  //     mutates (all DIRECT_CREATOR reconciliation dies silently);
  //   - missing public key → PLATFORM_COLLECT checkout cannot initialize in
  //     the browser. Deployment validation must therefore refuse before ship.
  "RAZORPAY_WEBHOOK_SECRET",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
  "DEFAULT_TENANT_SUBDOMAIN",
];

const WARN = [
  { key: "YOUTUBE_API_KEY", note: "YouTube stats/sync won't work" },
  { key: "INSTAGRAM_ACCESS_TOKEN", note: "Instagram sync won't work" },
  { key: "TWITCH_CLIENT_ID", note: "Twitch sync won't work" },
  { key: "TWITCH_CLIENT_SECRET", note: "Twitch sync won't work" },
  { key: "VERCEL_API_TOKEN", note: "Custom domain attachment won't work" },
  { key: "VERCEL_PROJECT_ID", note: "Custom domain attachment won't work" },
  { key: "STRIPE_SECRET_KEY", note: "Stripe billing won't work" },
  { key: "HEALTH_SECRET", note: "Health endpoint won't be protected" },
  { key: "RESEND_API_KEY", note: "Customer confirmation email will be log-only (no real email)" },
  { key: "EMAIL_FROM", note: "Customer confirmation email will be log-only (set to e.g. Pendallo <noreply@pendallo.in>)" },
];

let exitCode = 0;

console.log("\n🔐 Environment Variable Validation\n");

function decodeTokenKey(raw) {
  const trimmed = String(raw).trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, "hex");
  return Buffer.from(trimmed, "base64");
}

for (const key of REQUIRED) {
  const value = process.env[key];
  if (!value || value.startsWith("your-") || value === "") {
    console.error(`  ✗ ${key} — MISSING or placeholder`);
    exitCode = 1;
  } else {
    // RCCF-72.18D.7.4 — presence-only reporting. Never echo even a prefix of
    // credential values into deployment logs.
    console.log(`  ✅ ${key} — Set (${value.length} chars)`);
  }
}

// RCCF-INTEGRATIONS-02 — TOKEN_ENCRYPTION_KEY entropy/length validation.
// Must decode to exactly 32 bytes. Supports both documented representations:
//   hex:    `openssl rand -hex 32`  → 64 hex chars
//   base64: `openssl rand -base64 32` → ~44 chars (base64)
// Never logs key material.
{
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (raw && !raw.startsWith("your-") && raw !== "") {
    const trimmed = String(raw).trim();
    const isHex = /^[0-9a-fA-F]{64}$/.test(trimmed);
    const isBase64Shape = /^[A-Za-z0-9+/=_-]+$/.test(trimmed) && trimmed.length >= 40 && trimmed.length <= 48;
    let bytes = null;
    try {
      bytes = decodeTokenKey(raw);
    } catch {
      bytes = null;
    }
    if (!bytes || bytes.length !== 32) {
      console.error(
        `  ✗ TOKEN_ENCRYPTION_KEY — INVALID (decoded ${bytes ? bytes.length : 0} bytes, expected 32). Use 'openssl rand -hex 32' (64 hex) or 'openssl rand -base64 32' (44 chars)`,
      );
      exitCode = 1;
    } else if (!isHex && !isBase64Shape) {
      console.warn(`  ⚠️  TOKEN_ENCRYPTION_KEY — unexpected format (expected 64 hex or ~44 base64 chars) — decoded to 32 bytes, accepting`);
    } else {
      console.log(`  ✅ TOKEN_ENCRYPTION_KEY — valid (${isHex ? "hex" : "base64"}, 32 bytes)`);
    }
  }
}

console.log("");

// RCCF-BILLING-06B — Razorpay key equivalence (live vs test family + value match)
// Both keys must be present and belong to the same family (rzp_live_ vs rzp_test_)
// and carry the same value — a drift would charge live while checkout.js loads
// test (or vice versa). Presence-only, no secret material is echoed.
const pubKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
const secKey = process.env.RAZORPAY_KEY_ID ?? "";
if (pubKey && secKey) {
  const pubLive = pubKey.startsWith("rzp_live_");
  const secLive = secKey.startsWith("rzp_live_");
  const pubTest = pubKey.startsWith("rzp_test_");
  const secTest = secKey.startsWith("rzp_test_");
  const familyOk = (pubLive && secLive) || (pubTest && secTest);
  const valueOk = pubKey === secKey;
  if (!familyOk) {
    console.error(`  ✗ Razorpay key family MISMATCH — NEXT_PUBLIC_RAZORPAY_KEY_ID is ${pubLive ? "live" : pubTest ? "test" : "unknown"} but RAZORPAY_KEY_ID is ${secLive ? "live" : secTest ? "test" : "unknown"}`);
    exitCode = 1;
  } else if (!valueOk) {
    console.error(`  ✗ Razorpay key value MISMATCH — NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_ID differ (same family but different value)`);
    exitCode = 1;
  } else {
    console.log(`  ✅ Razorpay keys — Equivalent (${pubLive ? "live" : "test"} family, ${pubKey.length} chars)`);
  }
} else if (!pubKey || !secKey) {
  // missing already reported in REQUIRED loop; no extra output
}

console.log("");

for (const { key, note } of WARN) {
  const value = process.env[key];
  if (!value || value === "") {
    console.warn(`  ⚠️  ${key} — missing (${note})`);
  } else {
    console.log(`  ✅ ${key} — Set`);
  }
}

console.log("");
if (exitCode === 0) {
  console.log("✅ All critical environment variables are set.\n");
} else {
  console.error("❌ Some required environment variables are missing. Fix before deploying.\n");
}

process.exit(exitCode);
