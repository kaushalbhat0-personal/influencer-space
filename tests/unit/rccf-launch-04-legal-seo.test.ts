import { readFileSync } from "node:fs";
import { join } from "node:path";
function src(p: string) { return readFileSync(join(process.cwd(), p), "utf8"); }

describe("rccf-launch-04 legal", () => {
  it("creator legal is tenant-scoped Setting legal_* with generic templates", () => {
    const s = src("src/lib/legal/service.ts");
    expect(s).toContain("legal_");
    expect(s).toContain("Privacy Policy");
    expect(s).toContain("These are general templates");
  });
  it("footer uses creator-relative legal links, not platform-absolute", () => {
    const r = src("src/lib/registry/components/renderers.tsx");
    expect(r).toContain("creatorLegal");
    expect(r).toContain('"/privacy"');
    expect(r).not.toContain("platformLegal(\"/privacy\")");
  });
  it("middleware rewrites tenant legal on custom domain", () => {
    const m = src("src/middleware.ts");
    expect(m).toContain('"/disclaimer"');
    expect(m).toContain("isLegal");
  });
  it("tenant legal routes exist", () => {
    const p = src("src/app/[domain]/privacy/page.tsx");
    expect(p).toContain("legalService.get");
    expect(p).toContain("StorefrontChrome");
  });
  it("admin legal page exists", () => {
    const a = src("src/app/admin/legal/page.tsx");
    expect(a).toContain("legalService.getAll");
  });
  it("agency can manage client legal", () => {
    const a = src("src/features/legal/actions.ts");
    expect(a).toContain("agencyUpdateLegal");
    expect(a).toContain("assertAgencyOwnsTenant");
  });
});

describe("rccf-launch-04 seo human-friendly", () => {
  it("SEO page is Get Found on Google, not technical SEO", () => {
    const s = src("src/features/seo/components/seo-page.tsx");
    expect(s).toContain("Get Found on Google");
    expect(s).toContain("Website name");
    expect(s).toContain("Social sharing");
    expect(s).toContain("Search preview");
    expect(s).not.toContain("Robots.txt");
    expect(s).not.toContain("Structured Data (JSON-LD)");
    expect(s).not.toContain("Technical SEO");
  });
  it("admin nav SEO is Get Found on Google and Legal exists", () => {
    const n = src("src/config/admin-nav.ts");
    expect(n).toContain("Get Found on Google");
    expect(n).toContain('"/admin/legal"');
    expect(n).toContain('label: "Legal"');
  });
  it("no technical jargon in legal manager", () => {
    const m = src("src/app/admin/legal/_components/legal-manager.tsx");
    expect(m).not.toContain("canonical");
    expect(m).not.toContain("metadata");
  });
});

describe("rccf-launch-04 no second pipeline", () => {
  it("legal reuses Setting + no second snapshot", () => {
    const s = src("src/lib/legal/service.ts");
    expect(s).toContain("prisma.setting");
    expect(s).not.toContain("PublishSnapshot");
  });
  it("seo still uses single seoService + BuildRuntimeSnapshot", () => {
    const s = src("src/features/seo/service.ts");
    expect(s).toContain('key: "seo"');
    const loader = src("src/lib/storefront/storefront-loader.ts");
    expect(loader).toContain("buildRuntimeSnapshot");
  });
});
