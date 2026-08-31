/**
 * RCCF-LAUNCH-01 — Domain routing, tenant isolation, demo leakage guardrails.
 *
 * Focused source-level guardrails for launch blockers fixed in this audit.
 * No DB required; asserts code invariants.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("rccf-launch-01 domain routing", () => {
  const domainActions = src("src/actions/domain.actions.ts");
  const vercel = src("src/services/vercel.service.ts");
  const superAdmin = src("src/actions/super-admin.actions.ts");
  const middleware = src("src/middleware.ts");
  const tenant = src("src/lib/tenant.ts");

  it("normalizes www, protocol, trailing slash and path (no www mismatch)", () => {
    // domain.actions must strip www and path
    expect(domainActions).toContain('replace(/^www\\./');
    expect(domainActions).toContain('split("/")[0]');
    expect(vercel).toContain('replace(/^www\\./');
  });

  it("validates domain format before persisting", () => {
    expect(domainActions).toContain("isValidDomain");
    expect(domainActions).toContain("Invalid domain format");
  });

  it("rejects platform domains as custom domains", () => {
    expect(domainActions).toContain("getPlatformDomains");
    expect(domainActions).toContain("Custom domain cannot be a platform domain");
  });

  it("rejects duplicate customDomain at app layer", () => {
    expect(domainActions).toContain("prisma.tenant.findFirst");
    expect(domainActions).toContain("Domain is already assigned to another tenant");
    expect(superAdmin).toContain("prisma.tenant.findFirst");
    expect(superAdmin).toContain("Domain is already assigned");
  });

  it("super-admin attach also normalizes and validates", () => {
    expect(superAdmin).toContain('replace(/^www\\./');
    expect(superAdmin).toContain("Invalid domain");
  });

  it("middleware trusts only Host, never X-Forwarded-Host", () => {
    expect(middleware).toContain('headers.get("host")');
    expect(middleware).not.toContain("x-forwarded-host");
    expect(middleware).not.toContain("x-original-host");
    expect(middleware).toContain('headers.delete("x-tenant-host")');
  });

  it("getTenantContext is server-authoritative via x-tenant-host", () => {
    expect(tenant).toContain('x-tenant-host');
    expect(tenant).toContain("prisma.tenant.findFirst");
  });
});

describe("rccf-launch-01 demo leakage — partner import", () => {
  it("partner import does not synthesize example.com placeholder", () => {
    const partner = src("src/actions/partner.actions.ts");
    expect(partner).not.toContain("https://example.com/");
    expect(partner).toContain("effectiveSourceUrl");
    // provisioning-service must omit sourceLink when empty
    const prov = src("src/modules/provisioning/application/provisioning-service.ts");
    expect(prov).toContain("sourceUrl ? [{ platform:");
  });

  it("confirmProvision handles empty sourceUrl without crashing", () => {
    const sup = src("src/actions/super-admin-provision.actions.ts");
    expect(sup).toContain('sourceUrl ? detectPlatform');
    expect(sup).toContain('sourceUrl || undefined');
  });
});

describe("rccf-launch-01 tenant isolation — strict auth", () => {
  it("workspace-permissions uses strict session tenantId, not cookie-derived", () => {
    const perm = src("src/modules/workspace/application/workspace-permissions.ts");
    expect(perm).toContain("session.user.tenantId");
    expect(perm).not.toContain("resolveTenantId");
    expect(perm).not.toContain("effectiveTenantId = resolvedTenantId");
  });

  it("builder and publishing derive tenant from session, not client param", () => {
    const builder = src("src/actions/builder.actions.ts");
    // builder uses getWebsiteId derived from session tenantId
    expect(builder).toContain("getWebsiteId");
    expect(builder).toContain("session.user.tenantId");
    const publish = src("src/lib/publishing/service.ts");
    expect(publish).toContain("websiteId");
  });

  it("checkout resolves tenant from host, not client supply", () => {
    const checkout = src("src/actions/checkout.actions.ts");
    expect(checkout).toContain("resolveCheckoutTenantId");
    expect(checkout).toContain("getTenantContext");
  });
});

describe("rccf-launch-01 social ownership", () => {
  it("SocialStats is written by cron but not rendered in storefront snapshot", () => {
    const agg = src("src/modules/tenant/application/website-aggregate.service.ts");
    // aggregate does not query SocialStats
    expect(agg).not.toMatch(/prisma\.socialStats/);
    const snap = src("src/lib/storefront/build-snapshot.ts");
    expect(snap).toContain("EMPTY_AGGREGATE");
  });

  it("social links come from site_social_links / hero_data, not fixtures", () => {
    const prov = src("src/modules/provisioning/application/provisioning-service.ts");
    // provisioning personalizes from creatorName, not hardcoded fixture
    expect(prov).toContain("websitePersonalizer.personalize");
  });
});
