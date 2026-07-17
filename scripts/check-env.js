const fs = require("fs");
const content = fs.readFileSync(".env.local", "utf-8");
const vars = {};
content.split("\n").forEach((line) => {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) vars[m[1]] = m[2];
});

const required = [
  "DATABASE_URL", "DIRECT_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET", "TOKEN_ENCRYPTION_KEY",
  "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "DEFAULT_TENANT_SUBDOMAIN",
];

const warn = [
  "YOUTUBE_API_KEY", "INSTAGRAM_ACCESS_TOKEN", "TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET",
  "VERCEL_API_TOKEN", "VERCEL_PROJECT_ID", "STRIPE_SECRET_KEY", "HEALTH_SECRET",
];

console.log("\n=== CRITICAL ===");
let ok = 0; let fail = 0;
for (const k of required) {
  const v = vars[k] || "";
  if (!v || v.startsWith("your-") || v === '""' || v === "") {
    console.log("  MISSING: " + k);
    fail++;
  } else {
    const preview = v.length > 20 ? v.slice(0, 15) + "..." : v;
    console.log("  SET:     " + k + " (" + preview + ")");
    ok++;
  }
}

console.log("\n=== WARNINGS ===");
for (const k of warn) {
  const v = vars[k] || "";
  if (!v || v === '""' || v === "") {
    console.log("  MISSING: " + k + " (optional)");
  } else {
    console.log("  SET:     " + k);
  }
}

console.log("\nCritical: " + ok + " OK, " + fail + " MISSING\n");
