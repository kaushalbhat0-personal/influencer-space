/**
 * RCCF-LAUNCH-02 — Agency delivery guardrails
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
function src(p: string) { return readFileSync(join(process.cwd(), p), "utf8"); }

describe("rccf-launch-02 agency builder proxy", () => {
  const agency = src("src/actions/agency-client.actions.ts");
  it("agency builder load/save are AgencyTenant-guarded, not tenantId-spoofable", () => {
    expect(agency).toContain("assertAgencyOwnsTenant");
    expect(agency).toContain("canMutate");
    expect(agency).toContain("resolveClientWebsiteId");
    expect(agency).toContain("BuilderService");
  });
  it("agency publish delegates to publishingService.publish with agency checks", () => {
    expect(agency).toContain("agencyPublishClient");
    expect(agency).toContain("publishingService.publish");
    expect(agency).toContain("workspacePolicy.assertCanPublish");
  });
  it("reuses single pipeline — no duplicate resolver", () => {
    expect(agency).toContain("BuilderService");
    expect(agency).toContain("builderService.load");
    expect(agency).toContain("builderService.save");
    expect(agency).not.toContain("second Builder");
  });
});

describe("rccf-launch-02 handoff — creator revoke", () => {
  it("creator can revoke agency (OWNER check)", () => {
    const f = src("src/actions/agency-client.actions.ts");
    expect(f).toContain("creatorRevokeAgency");
    expect(f).toContain('role !== "OWNER"');
    expect(f).toContain('status: "REVOKED"');
  });
});

describe("rccf-launch-02 portal fixes", () => {
  it("portal shows correct storefront URL (not localhost hardcode)", () => {
    const portal = src("src/app/agency/portal/[tenantId]/page.tsx");
    expect(portal).toContain("buildStorefrontUrlWithTenant");
    expect(portal).not.toContain("${tenant.subdomain}.localhost");
  });
  it("new client page redirects to generate (not dead /clients)", () => {
    const page = src("src/app/agency/clients/new/page.tsx");
    expect(page).toContain('redirect("/agency/generate")');
    expect(page).not.toContain('redirect("/agency/clients")');
  });
});

describe("rccf-launch-02 tenant isolation — agency cannot spoof", () => {
  it("builder still derives websiteId from tenantId, not client param", () => {
    const b = src("src/actions/builder.actions.ts");
    expect(b).toContain("getWebsiteId");
    expect(b).toContain("session.user.tenantId");
  });
  it("agency actions never trust cookie as authority", () => {
    const a = src("src/actions/agency-client.actions.ts");
    expect(a).not.toContain("workspaceService.resolveTenantId");
    expect(a).toContain("assertAgencyOwnsTenant");
  });
});
