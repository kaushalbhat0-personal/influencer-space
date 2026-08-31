import { readFileSync } from "node:fs";
import { join } from "node:path";
function src(p:string){ return readFileSync(join(process.cwd(),p),"utf8"); }

describe("rccf-launch-06 agency SEO proxy", () => {
  it("agency can manage client SEO via same service", () => {
    const a = src("src/features/seo/actions.ts");
    expect(a).toContain("agencyGetSEO");
    expect(a).toContain("agencyUpdateSEO");
    expect(a).toContain("assertAgencyOwnsTenant");
    expect(a).toContain("seoService.get");
  });
  it("agency SEO only human fields", () => {
    const a = src("src/features/seo/actions.ts");
    expect(a).toContain("title: input.title");
    expect(a).toContain("ogImage");
    expect(a).not.toContain("canonicalUrl");
    expect(a).not.toContain("robotsTxt");
  });
});

describe("rccf-launch-06 onboarding orphan documented", () => {
  it("Workspace.onboardingCompleted marked deprecated legacy", () => {
    const s = src("prisma/schema.prisma");
    expect(s).toContain("@deprecated legacy");
    expect(s).toContain("onboardingCompleted");
  });
});

describe("rccf-launch-06 help search aliases", () => {
  it("domain aliases all find Connect your domain", () => {
    const d = src("src/lib/guidance/definitions.ts");
    expect(d).toContain('"domain"');
    expect(d).toContain('"website address"');
    expect(d).toContain('"web address"');
    expect(d).toContain('"custom domain"');
  });
  it("google aliases cover appear on google and get found", () => {
    const d = src("src/lib/guidance/definitions.ts");
    expect(d).toContain("appear on google");
    expect(d).toContain("get found");
  });
  it("help panel no-results is humane", () => {
    const p = src("src/components/guidance/HelpPanel.tsx");
    expect(p).toContain("We couldn");
    expect(p).not.toContain("No records found");
  });
});

describe("rccf-launch-06 builder contextual help", () => {
  it("Sections header has contextual help", () => {
    const s = src("src/features/builder/components/sidebar.tsx");
    expect(s).toContain("ContextualHelp");
    expect(s).toContain("Add, remove or rearrange");
  });
  it("Save Draft has contextual help", () => {
    const t = src("src/features/builder/components/toolbar.tsx");
    expect(t).toContain("ContextualHelp");
    expect(t).toContain("Save your latest changes without making them public");
  });
});

describe("rccf-launch-06 SEO preview wrapping", () => {
  it("seo preview breaks words, not truncate", () => {
    const s = src("src/features/seo/components/seo-page.tsx");
    expect(s).toContain("break-words");
    expect(s).toContain("break-all");
    expect(s).not.toContain('truncate">{data.title');
  });
});
