import { describe, it, expect, vi, beforeEach } from "vitest";

describe("P1-2 /api/debug/storefront — SUPER_ADMIN-only", () => {
  it("route source requires SUPER_ADMIN", async () => {
    const src = await import("fs").then((m) => m.readFileSync("src/app/api/debug/storefront/route.ts", "utf8"));
    expect(src).toContain('role !== "SUPER_ADMIN"');
    expect(src).toContain("Forbidden");
    expect(src).toContain("getServerSession");
  });
});

describe("P1-2 /api/health — no secret disclosure", () => {
  it("health route never returns env secrets and has no hardcoded fallback", async () => {
    const src = await import("fs").then((m) => m.readFileSync("src/app/api/health/route.ts", "utf8"));
    expect(src).not.toContain('"local-dev-secret"');
    expect(src).not.toContain("local-dev-secret");
    expect(src).not.toContain("supabaseServiceKey");
    expect(src).not.toContain("DATABASE_URL");
    expect(src).not.toContain("NEXTAUTH_SECRET");
    expect(src).not.toContain("TOKEN_ENCRYPTION_KEY");
    expect(src).not.toContain("RAZORPAY_WEBHOOK_SECRET");
    expect(src).toContain('Not configured');
    expect(src).not.toMatch(/env:\s*\{[^}]*supabaseUrl/);
  });
  it("health requires configured secret", async () => {
    const src = await import("fs").then((m) => m.readFileSync("src/app/api/health/route.ts", "utf8"));
    expect(src).toContain("process.env.HEALTH_SECRET");
    expect(src).toContain('if (!configuredSecret)');
  });
});

describe("P1-3A billing.actions requireAuth", () => {
  it("requireAuth is not a no-op", async () => {
    const src = await import("fs").then((m) => m.readFileSync("src/actions/billing.actions.ts", "utf8"));
    expect(src).toContain("getServerSession");
    expect(src).toContain("SUPER_ADMIN");
    expect(src).toContain("tenantId");
    // No longer a trivial return-true stub
    expect(src).toContain('return { ok: false, error: "Unauthorized" }');
    expect(src).toContain('return { ok: false, error: "Forbidden" }');
  });
  it("authorizeWorkspace still enforces tenant/workspace match", async () => {
    const src = await import("fs").then((m) => m.readFileSync("src/actions/billing.actions.ts", "utf8"));
    expect(src).toContain("authorizeWorkspace");
    expect(src).toContain("workspace.findFirst");
    expect(src).toContain("tenantId");
  });
});

describe("P1-3B /api/auth/login-as POST hardening", () => {
  it("GET is denied, POST is required", async () => {
    const src = await import("fs").then((m) => m.readFileSync("src/app/api/auth/login-as/route.ts", "utf8"));
    expect(src).toContain('export async function GET');
    expect(src).toContain("Method not allowed");
    expect(src).toContain("export async function POST");
  });
  it("token is taken from POST body, not query", async () => {
    const src = await import("fs").then((m) => m.readFileSync("src/app/api/auth/login-as/route.ts", "utf8"));
    expect(src).toContain("request.json");
    expect(src).not.toContain("searchParams.get(\"token\")");
    expect(src).not.toContain("nextUrl.searchParams");
  });
  it("enforces one-time jti via LoginAsToken", async () => {
    const src = await import("fs").then((m) => m.readFileSync("src/app/api/auth/login-as/route.ts", "utf8"));
    expect(src).toContain("prisma.loginAsToken");
    expect(src).toContain("updateMany");
    expect(src).toContain("usedAt");
    expect(src).toContain("expiresAt");
    expect(src).toContain("already used");
    expect(src).toContain("expired");
  });
  it("requires SUPER_ADMIN session and CSRF check", async () => {
    const src = await import("fs").then((m) => m.readFileSync("src/app/api/auth/login-as/route.ts", "utf8"));
    expect(src).toContain('role !== "SUPER_ADMIN"');
    expect(src).toContain("CSRF");
    expect(src).toContain("origin");
  });
  it("super-admin token generation creates LoginAsToken row with jti", async () => {
    const src = await import("fs").then((m) => m.readFileSync("src/actions/super-admin.actions.ts", "utf8"));
    expect(src).toContain("prisma.loginAsToken.create");
    expect(src).toContain("jti");
    expect(src).toContain("setJti");
    expect(src).toContain("crypto.randomUUID");
  });
  it("does not log raw token", async () => {
    const src = await import("fs").then((m) => m.readFileSync("src/app/api/auth/login-as/route.ts", "utf8"));
    expect(src).not.toMatch(/console\.log.*token/i);
    expect(src).not.toContain("actorToken");
  });
});

describe("P1-1 webhook signature remains HMAC+timingSafe", () => {
  it("webhook route uses HMAC SHA256 + timingSafeEqual fail-closed", async () => {
    const src = await import("fs").then((m) => m.readFileSync("src/app/api/webhooks/razorpay/route.ts", "utf8"));
    expect(src).toContain('createHmac("sha256"');
    expect(src).toContain("timingSafeEqual");
    expect(src).toContain("Invalid signature");
    expect(src).toContain("Webhook secret not configured");
  });
});
