import { readFileSync } from "node:fs";
import { join } from "node:path";
function src(p:string){ return readFileSync(join(process.cwd(),p),"utf8"); }

describe("rccf-launch-09 perf — dashboard bulk counts", () => {
  it("dashboard getMetrics uses count not findMany for products", () => {
    const s = src("src/features/dashboard/service.ts");
    expect(s).toContain("prisma.product.count({ where: { tenantId } })");
    expect(s).toContain("prisma.product.count({ where: { tenantId, status: \"PUBLISHED\" } })");
    expect(s).not.toContain("prisma.product.findMany({ where: { tenantId }, select: { id: true");
  });
  it("dashboard recentVersions limited to 10 live snapshots", () => {
    const s = src("src/features/dashboard/service.ts");
    expect(s).toContain("findMany({");
    expect(s).toContain("take: 10");
    expect(s).toContain("state: \"live\"");
  });
});

describe("rccf-launch-09 perf — activity tenant isolation limited", () => {
  it("activity fetches only needed tenants, not all", () => {
    const a = src("src/app/super-admin/activity/page.tsx");
    expect(a).toContain("neededTenantIds");
    expect(a).toContain("where: { id: { in: neededTenantIds } }");
    expect(a).not.toContain("prisma.tenant.findMany({ select: { id: true, name: true } })");
  });
  it("getUnifiedActivity limited to 150", () => {
    const o = src("src/actions/operations.actions.ts");
    expect(o).toContain("take: 150");
    expect(o).not.toContain("take: 300");
  });
});

describe("rccf-launch-09 perf — no N+1 registry", () => {
  it("themeRegistry is singleton module-level", () => {
    const t = src("src/lib/theme/registry-new.ts");
    expect(t).toContain("export const themeRegistry = new ThemeRegistry()");
    expect(t).toContain("private initialized = false");
    expect(t).toContain("ensureInitialized()");
  });
  it("super-admin themes page does not await per-theme capability", () => {
    const p = src("src/app/super-admin/themes/page.tsx");
    expect(p).not.toContain("capabilityService");
    expect(p).toContain("themeRegistry.getAll()");
  });
});

describe("rccf-launch-09 perf — smoke test networkidle removed", () => {
  it("smoke login spec does not block on networkidle for registry pages", () => {
    const s = src("tests/e2e/smoke/login.spec.ts");
    expect(s).not.toContain('waitForLoadState("networkidle")');
    expect(s).toContain('expect(page.locator("text=Themes")');
  });
});
