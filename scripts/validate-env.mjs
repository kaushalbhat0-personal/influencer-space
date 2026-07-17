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
];

let exitCode = 0;

console.log("\n🔐 Environment Variable Validation\n");

for (const key of REQUIRED) {
  const value = process.env[key];
  if (!value || value.startsWith("your-") || value === "") {
    console.error(`  ❌ ${key} — MISSING or placeholder`);
    exitCode = 1;
  } else {
    console.log(`  ✅ ${key} — ${value.length > 20 ? value.slice(0, 12) + "..." : "Set"}`);
  }
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
