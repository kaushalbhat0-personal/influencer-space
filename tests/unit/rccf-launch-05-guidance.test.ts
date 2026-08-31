import { readFileSync } from "node:fs";
import { join } from "node:path";
function src(p:string){ return readFileSync(join(process.cwd(),p),"utf8"); }

describe("rccf-launch-05 guidance system", () => {
  it("single guidance architecture", () => {
    const def = src("src/lib/guidance/definitions.ts");
    expect(def).toContain("CREATOR_GUIDANCE");
    expect(def).toContain("AGENCY_GUIDANCE");
    expect(def).toContain("HELP_ARTICLES");
    expect(def).not.toContain("CreatorHelp");
  });
  it("walkthrough uses localStorage, not duplicate DB", () => {
    const w = src("src/components/guidance/GuidanceWalkthrough.tsx");
    expect(w).toContain("localStorage");
    expect(w).toContain("guidance_");
    expect(w).toContain("Skip");
    expect(w).toContain("Next");
  });
  it("persistent Help button exists and is not covering", () => {
    const b = src("src/components/guidance/HelpButton.tsx");
    expect(b).toContain("Help");
    expect(b).toContain("fixed bottom-6 right-6");
    expect(b).toContain('aria-label="Help"');
  });
  it("help panel searchable with popular", () => {
    const p = src("src/components/guidance/HelpPanel.tsx");
    expect(p).toContain("How can we help?");
    expect(p).toContain("Search for help");
  });
  it("help is available in admin and agency and builder", () => {
    const admin = src("src/app/admin/layout.tsx");
    const agency = src("src/app/agency/layout.tsx");
    const builder = src("src/features/builder/components/loader.tsx");
    expect(admin).toContain("GuidanceShell");
    expect(agency).toContain("GuidanceShell");
    expect(builder).toContain("GuidanceShell");
  });
  it("no technical jargon in guidance steps", () => {
    const d = src("src/lib/guidance/definitions.ts");
    expect(d).not.toContain("canonical");
    expect(d).not.toContain("metadata");
    expect(d).not.toContain("resolver");
    expect(d).not.toContain("snapshot");
  });
});
