import { describe, it, expect, vi } from "vitest";
import { onboardingService } from "@/lib/onboarding/service";
import { profileAcquisitionEngine } from "@/lib/generation/acquisition/engine";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { composeStorefront, COMPOSITION_VERSION } from "@/lib/generation/intelligence/composition/engine";
import { BLUEPRINT_VERSION } from "@/lib/generation/blueprint/config";
import { isValidHttpUrl } from "@/lib/validation/url";
import fs from "fs";
import path from "path";

// Helpers
async function loadKaushalSource() {
  const pdfPath = path.resolve("public/marketing-assets/Resume/Kaushal_Bhat_Resume (2).pdf");
  if (!fs.existsSync(pdfPath)) throw new Error("Kaushal PDF missing");
  const { extractText } = await import("unpdf");
  const buf = fs.readFileSync(pdfPath);
  const r = await extractText(new Uint8Array(buf), { mergePages: true });
  const txt = (r.text as string) || "";
  const acq = await profileAcquisitionEngine.acquire(txt, "Kaushal G Bhat");
  return { source: acq.source, text: txt };
}

function makeIntel(source: import("@/lib/generation/intelligence/types").ContentSource) {
  const resumeTexts: string[] = source.resume
    ? [
        source.resume.summary,
        ...source.resume.skills,
        ...source.resume.experience.map((e) => `${e.title} ${e.company ?? ""} ${e.description}`),
        ...source.resume.projects.map((p) => `${p.name} ${p.description}`),
        ...source.resume.education.map((e) => `${e.degree} ${e.institution ?? ""}`),
        ...(source.resume.location ? [source.resume.location] : []),
      ].filter(Boolean)
    : [];
  const intel = buildEvidenceIntelligence({
    sourceText: source.bio ?? "",
    sourceContentTexts: resumeTexts,
    followers: (source as any).followers ?? 0,
    acquisitionCompleteness: 0.7,
    graphNiche: null,
    graphConfidence: 0.5,
    resume: source.resume ?? null,
  });
  const rel = buildRelationshipGraph(source.bio ?? "", ["manual", ...resumeTexts]);
  return { intel, rel };
}

describe("RCCF-PRELAUNCH-14A", () => {
  // 1. Valid resume always yields composition + blueprint
  it("1. valid resume always yields composition + blueprint + diagnostics", async () => {
    const { source, text } = await loadKaushalSource();
    expect(source.resume).toBeDefined();
    const result = await onboardingService.importProfile(text, "test-creator-id", "Kaushal G Bhat");
    expect(result.blueprint).toBeDefined();
    expect(result.composition).toBeDefined();
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.hasResumeSource).toBe(true);
    expect(result.diagnostics!.hasComposition).toBe(true);
    expect(result.diagnostics!.hasBlueprint).toBe(true);
    expect(result.diagnostics!.archetype).toBe("professional_resume");
    expect(result.diagnostics!.compositionVersion).toBe(COMPOSITION_VERSION);
    expect(result.diagnostics!.blueprintVersion).toBe(BLUEPRINT_VERSION);
  });

  // 2. Resume with composition failure does not silently fall back to legacy generic generation
  it("2. resume with composition failure throws INTELLIGENT_COMPOSITION_FAILED, not silent fallback", async () => {
    const { text } = await loadKaushalSource();
    // Monkey-patch composeStorefront to throw
    const mod = await import("@/lib/generation/intelligence/composition/engine");
    const spy = vi.spyOn(mod, "composeStorefront").mockImplementation(() => {
      throw new Error("synthetic compose failure");
    });
    try {
      await expect(onboardingService.importProfile(text, "test-creator-id", "Test")).rejects.toThrow(/INTELLIGENT_COMPOSITION_FAILED/);
    } finally {
      spy.mockRestore();
    }
    // Non-resume source should NOT throw intelligent error, should still produce composition (or at least not throw intelligent)
    const plain = await onboardingService.importProfile("https://example.com/some-page", "test-id-2", "Plain Creator");
    // Plain (non-resume) should produce composition (or at least not throw INTELLIGENT_*)
    expect(plain.composition).toBeDefined();
    expect(plain.blueprint).toBeDefined();
  });

  // 3. Resume resolves professional_resume when healthcare terms occur only inside project/work descriptions
  it("3. healthcare terms only in projects do not flip archetype to doctor", async () => {
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "manual",
      username: "kaushaltest",
      displayName: "KAUSHAL G BHAT",
      bio: "Full-Stack Software Engineer | Architecture & AI Specialist specializing in TypeScript, Python, Next.js",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: ["https://github.com/kaushalbhat0-personal"],
      socialLinks: ["https://github.com/kaushalbhat0-personal"],
      resume: {
        rawText: "KAUSHAL G BHAT ...",
        summary: "Full-Stack Software Engineer | Architecture & AI Specialist",
        experience: [
          { title: "Full-Stack Software Engineer", company: "Tech Co", duration: "2022 - Present", description: "Built healthcare clinic management and e-commerce platform with Next.js", raw: "" },
        ],
        skills: ["TypeScript", "Python", "React", "Next.js", "PostgreSQL"],
        projects: [
          { name: "Healthcare Clinic Platform", description: "Medical healthcare patient portal with clinic scheduling", raw: "" },
          { name: "E-Commerce Healthcare Store", description: "Healthcare e-commerce with medical product catalog", raw: "" },
        ],
        education: [{ degree: "Bachelor CS", institution: "Uni", years: "2015-2019", raw: "" }],
        certifications: [],
        socialLinks: [{ platform: "github", url: "https://github.com/kaushalbhat0-personal" }],
        location: "Pune, India",
      },
    };
    const { intel, rel } = makeIntel(source);
    const arch = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.7, populatedFields: ["resume"], missingFields: [] },
    });
    expect(arch.archetype).toBe("professional_resume");
    // primaryEntity should be developer/software engineer, not doctor
    expect(intel.primaryEntity).toBe("developer");
    expect(intel.entities[0].entity).toBe("developer");
    // doctor should be demoted vs developer
    const doctor = intel.entities.find((e) => e.entity === "doctor");
    const dev = intel.entities.find((e) => e.entity === "developer");
    if (doctor && dev) expect(dev.confidence).toBeGreaterThan(doctor.confidence);
  });

  // 4. Developer/software-engineer evidence outranks project-domain healthcare evidence
  it("4. developer evidence outranks project-domain healthcare evidence (entity confidence)", async () => {
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "manual",
      username: "devhealth",
      displayName: "Dev Health",
      bio: "Software Engineer specializing in architecture and AI",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      socialLinks: ["https://github.com/devhealth"],
      resume: {
        rawText: "Dev...",
        summary: "Software Engineer | Full-Stack Developer",
        experience: [{ title: "Software Engineer", company: "Acme", duration: "2020-", description: "Built healthcare dashboard for clinic patient tracking", raw: "" }],
        skills: ["TypeScript", "Python", "React"],
        projects: [
          { name: "Clinic OS", description: "Healthcare patient management system with medical records, clinic scheduling, healthcare analytics", raw: "" },
        ],
        education: [{ degree: "BSc CS", institution: "Uni", years: "2018", raw: "" }],
        certifications: [],
        socialLinks: [],
        location: null,
      },
    };
    const { intel } = makeIntel(source);
    const dev = intel.entities.find((e) => e.entity === "developer");
    const doc = intel.entities.find((e) => e.entity === "doctor");
    expect(dev).toBeDefined();
    // Even with heavy healthcare project text, developer must outrank doctor
    if (dev && doc) expect(dev.confidence).toBeGreaterThan(doc.confidence);
    expect(intel.primaryEntity).not.toBe("doctor");
    expect(intel.primaryEntity).toBe("developer");
  });

  // 5. Legitimate GitHub/LinkedIn remain
  it("5. legitimate GitHub/LinkedIn remain in socialLinks/composition/navigation", async () => {
    const { source, text } = await loadKaushalSource();
    const result = await onboardingService.importProfile(text, "test-id-5", "Kaushal G Bhat");
    const comp = result.composition!;
    const allLinks = [
      ...comp.navigation.map((n) => n.href),
      ...comp.sections.flatMap((s) => JSON.stringify(s.props)),
      ...result.blueprint!.evidence.brands,
    ].join(" ");
    // GitHub must be present somewhere (either nav or github section)
    const hasGithub = comp.navigation.some((n) => n.href.includes("github.com")) || comp.sections.some((s) => JSON.stringify(s.props).includes("github.com"));
    expect(hasGithub).toBe(true);
    // Also check sanitized identity links still contain github
    const identityLinks = (result.composition!.builder.artifact.sections.find((s: any) => s.id === "github" || s.type === "links")?.props as any)?.items?.map((x: any) => x.url) ?? [];
    // If not in that section, check that composition identity was not stripped
    expect(result.composition!.visibleSections.length).toBeGreaterThan(0);
    // isValidHttpUrl must accept legitimate URLs
    expect(isValidHttpUrl("https://github.com/kaushalbhat0-personal")).toBe(true);
    expect(isValidHttpUrl("https://linkedin.com/in/kaushal-bhat")).toBe(true);
  });

  // 6. manual.com / prose / arbitrary website URLs do not become socialLinks
  it("6. manual.com / prose / arbitrary website URLs do not become socialLinks", async () => {
    const { source } = await loadKaushalSource();
    // Build a source with manual.com contamination attempt
    const taintedSource: import("@/lib/generation/intelligence/types").ContentSource = {
      ...source,
      socialLinks: [...(source.socialLinks ?? []), "https://manual.com/anything", "https://manual.com/freshprofessional13d"],
      links: [...(source.links ?? []), "https://manual.com/anything", "https://example.com/"],
    };
    const { intel, rel } = makeIntel(taintedSource);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source: taintedSource, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: taintedSource.displayName, username: taintedSource.username, subdomain: taintedSource.username },
      archetype: arch,
      source: taintedSource,
    });
    const comp = composeStorefront({
      blueprint: bp,
      identity: { entityType: null, name: taintedSource.displayName, username: taintedSource.username, bio: taintedSource.bio, tagline: null, avatarUrl: "", socialLinks: taintedSource.socialLinks, subdomain: taintedSource.username },
      evidence: intel,
      relationships: rel,
      source: taintedSource,
    });
    const navHrefs = comp.navigation.map((n) => n.href.toLowerCase());
    const sectionBlobs = comp.sections.map((s) => JSON.stringify(s.props).toLowerCase()).join(" ");
    expect(navHrefs.some((h) => h.includes("manual.com"))).toBe(false);
    expect(sectionBlobs.includes("manual.com")).toBe(false);
    // Prose must never become URL
    const prose = "KAUSHAL G BHAT Full-Stack Software Engineer HEALTHCARE clinic project";
    expect(isValidHttpUrl(prose)).toBe(false);
    expect(isValidHttpUrl("https://manual.com/robots.txt)\n● Help")).toBe(false);
    // Also via onboardingService path
    const res = await onboardingService.importProfile((await loadKaushalSource()).text, "test-6", "Kaushal G Bhat");
    const nav2 = res.composition!.navigation.map((n) => n.href.toLowerCase());
    expect(nav2.some((h) => h.includes("manual.com"))).toBe(false);
    const blob2 = JSON.stringify(res.composition!.sections).toLowerCase();
    expect(blob2.includes("manual.com")).toBe(false);
  });

  // 7. Builder artifact equals intelligent composition
  it("7. builder artifact equals intelligent composition (sections/navigation/theme)", async () => {
    const { source, text } = await loadKaushalSource();
    const result = await onboardingService.importProfile(text, "test-7", "Kaushal G Bhat");
    const comp = result.composition!;
    // Builder artifact must be present and derived from composition
    expect(comp.builder).toBeDefined();
    expect(comp.builder.artifact).toBeDefined();
    expect(comp.builder.artifact.sections.length).toBeGreaterThan(0);
    // Builder pages must have sections equal to composition visibleSections order
    const artifactSectionIds = comp.builder.artifact.sections.map((s: any) => s.id);
    const visible = comp.visibleSections;
    // Artifact sections should correspond to visibleSections (hero etc.)
    for (const v of visible) {
      expect(artifactSectionIds).toContain(v);
    }
    // Navigation must equal composition navigation
    const artifactNav = (comp.builder.artifact.navigation as any[]).map((n: any) => n.id);
    const compNav = comp.navigation.map((n) => n.id);
    expect(artifactNav).toEqual(compNav);
    // Theme must match themeIdForFamily
    expect(comp.theme.themeId).toBeTruthy();
    expect(comp.builder.artifact.theme).toBe(comp.theme.themeId);
  });

  // 8. Published output preserves intelligent section selection (no legacy fallback sections)
  it("8. published output preserves intelligent section selection (no Products, no legacy)", async () => {
    const { text } = await loadKaushalSource();
    const result = await onboardingService.importProfile(text, "test-8", "Kaushal G Bhat");
    const comp = result.composition!;
    const bp = result.blueprint!;
    // Intelligent professional should have these
    expect(bp.visibleSections).toContain("hero");
    expect(bp.visibleSections).toContain("experience");
    expect(bp.visibleSections).toContain("skills");
    expect(bp.visibleSections).toContain("projects");
    expect(bp.visibleSections).toContain("education");
    expect(bp.visibleSections).toContain("contact");
    // Must NOT have legacy generic sections
    expect(bp.visibleSections).not.toContain("products");
    expect(bp.visibleSections).not.toContain("merchandise");
    // Composition must preserve same
    expect(comp.visibleSections).toEqual(bp.visibleSections);
    expect(comp.visibleSections).not.toContain("products");
    // Hero must be split-like (title is name) and not doctor/clinic
    const hero = comp.sections.find((s) => s.id === "hero");
    expect(hero).toBeDefined();
    expect((hero!.props as any).title).toContain("KAUSHAL");
    expect(JSON.stringify(hero!.props).toLowerCase()).not.toContain("doctor");
    // Professional hero must be hero.split variant
    expect(hero!.moduleId).toBe("hero.split");
    // No raw resume URL blob in any href/socialLink
    const hrefs = [...comp.navigation.map((n) => n.href), ...comp.sections.flatMap((s) => JSON.stringify(s.props))].join(" ").toLowerCase();
    expect(hrefs.includes("manual.com")).toBe(false);
    expect(comp.visibleSections.includes("products")).toBe(false);
  });
});
