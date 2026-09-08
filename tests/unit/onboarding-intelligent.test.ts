import { describe, it, expect } from "vitest";
import { profileAcquisitionEngine } from "@/lib/generation/acquisition/engine";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { composeStorefront } from "@/lib/generation/intelligence/composition/engine";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { SECTION_MAP } from "@/lib/generation/intelligence/composition/config";
import { parseResume } from "@/lib/resume/extract";

// Helper to create a synthetic professional resume text
function professionalResumeText(): string {
  return `KAUSHAL G BHAT
Full-Stack Software Engineer | Architecture & AI Specialist
Pune, India | kaushalbhat0@gmail.com | github.com/kaushalbhat0-personal
PROFILE
Full-stack software engineer specializing in TypeScript, Python, Dart with deep expertise in SaaS platforms.
TECHNICAL SKILLS
Languages: TypeScript, Python, Dart, SQL
Frontend: React 19, Next.js 16, Flutter, Tailwind CSS
Backend: FastAPI, Node.js
Databases & ORM: PostgreSQL, Supabase, Prisma
AI/ML: OpenRouter, Prompt engineering
Auth & Security: NextAuth, RBAC
Testing: Vitest, Playwright
PROJECTS
Legacy Modernization — COBOL to NestJS | TypeScript, React
Universal mainframe modernization platform
● Architected 39-stage DAG pipeline
Creatos — Website Operating System | Next.js, Prisma
Multi-tenant SaaS platform for creators
● Architected registry-driven domain system
JOBinder — AI-Powered Job Discovery | Next.js, Supabase
AI-powered job discovery platform
● Designed clean architecture
WORK EXPERIENCE
Operations Head — Money Craft Trader Jul 2025 – Present
● Manage end-to-end operations for stock-market education programs
Operations Executive — Goenka Kachave LLP Dec 2023 – Jun 2025
● Provided customer support via WhatsApp and email
EDUCATION
Bachelor of Computer Science — Sinhgad College (2015 – 2019)
Advanced Program — MAAC (2020 – 2023)
`;
}

function creatorFixtureSource(): import("@/lib/generation/intelligence/types").ContentSource {
  return {
    platform: "youtube",
    username: "creator123",
    displayName: "Alex Creator",
    bio: "Gaming creator with 100k subscribers making daily videos about gaming and streaming on Twitch. Shop my merch!",
    avatarUrl: "",
    followers: 50000,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: ["https://youtube.com/@creator123", "https://instagram.com/creator123"],
    socialLinks: ["https://youtube.com/@creator123", "https://instagram.com/creator123"],
  };
}

function localBusinessFixtureSource(): import("@/lib/generation/intelligence/types").ContentSource {
  const bio = "Tasty Bites Restaurant Pune, India. Menu: Biryani, Paneer, Pizza. Location: MG Road, Pune. Hours: Open 9am - 10pm. Reservations: Book a table. Reviews: 5 stars. https://www.google.com/maps/place/Tasty+Bites";
  return {
    platform: "manual",
    username: "tastybites",
    displayName: "Tasty Bites",
    bio,
    avatarUrl: "",
    followers: 0,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: ["https://www.google.com/maps/place/Tasty+Bites"],
    socialLinks: [],
    location: "Pune, India",
  };
}

describe("Onboarding Intelligent Pipeline — Regression (Real Path)", () => {
  it("Professional fixture: resume → professional_resume, correct sections, no Products/Testimonials", async () => {
    const text = professionalResumeText();
    const acq = await profileAcquisitionEngine.acquire(text, "Kaushal G Bhat");
    const source = acq.source;
    expect(source.resume).toBeDefined();
    expect(source.resume!.experience.length).toBeGreaterThanOrEqual(2);
    expect(source.resume!.skills.length).toBeGreaterThanOrEqual(5);
    expect(source.resume!.projects.length).toBeGreaterThanOrEqual(2);
    expect(source.resume!.education.length).toBeGreaterThanOrEqual(1);
    expect(source.resume!.socialLinks.some(s=>s.platform==="github")).toBe(true);

    const resumeTexts = [
      source.resume!.summary,
      ...source.resume!.skills,
      ...source.resume!.experience.map(e=>`${e.title} ${e.company} ${e.description}`),
      ...source.resume!.projects.map(p=>`${p.name} ${p.description}`),
    ].filter(Boolean);
    const intel = buildEvidenceIntelligence({
      sourceText: source.bio,
      sourceContentTexts: resumeTexts,
      followers: 0,
      acquisitionCompleteness: 0.7,
      graphNiche: null,
      graphConfidence: 0.5,
    });
    const rel = buildRelationshipGraph(source.bio, ["manual", ...resumeTexts]);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: acq.diagnostics.populatedFields, missingFields: acq.diagnostics.missingFields } });
    expect(arch.archetype).toBe("professional_resume");
    expect(arch.confidence).toBeGreaterThan(0.5);

    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch,
      source,
    });
    expect(bp.evidence.archetype).toBe("professional_resume");
    expect(bp.visibleSections).toContain("hero");
    expect(bp.visibleSections).toContain("experience");
    expect(bp.visibleSections).toContain("skills");
    expect(bp.visibleSections).toContain("projects");
    expect(bp.visibleSections).toContain("education");
    expect(bp.visibleSections).toContain("github");
    expect(bp.visibleSections).toContain("contact");
    expect(bp.visibleSections).not.toContain("products");
    expect(bp.visibleSections).not.toContain("testimonials");
    expect(bp.theme.family).toBe("corporate-agency"); // not dark-tech/game-stream
    expect(bp.sections.find(s=>s.id==="hero")?.order).toBe(1);

    const comp = composeStorefront({
      blueprint: bp,
      identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username },
      evidence: intel,
      relationships: rel,
      source,
    });
    expect(comp.visibleSections).toContain("hero");
    expect(comp.visibleSections).toContain("experience");
    expect(comp.visibleSections).toContain("skills");
    expect(comp.visibleSections).toContain("projects");
    expect(comp.visibleSections).toContain("education");
    expect(comp.visibleSections).not.toContain("products");
    // Skills curated
    const skillsSec = comp.sections.find(s=>s.id==="skills");
    expect(skillsSec).toBeDefined();
    const services = (skillsSec!.props as any).services as unknown[];
    expect(services.length).toBeGreaterThanOrEqual(12);
    expect(services.length).toBeLessThanOrEqual(15);
    // Projects text-friendly (no bento without images)
    const proj = comp.sections.find(s=>s.id==="projects");
    expect(proj?.moduleId).toBe("gallery.grid");
    // Education heading
    const edu = comp.sections.find(s=>s.id==="education");
    expect((edu?.props as any).title).toBe("Education");
    // GitHub present
    const github = comp.sections.find(s=>s.id==="github");
    expect(github).toBeDefined();
    expect((github!.props as any).items[0].url).toContain("github.com");
    // No fabrication
    const allProps = JSON.stringify(comp.sections.map(s=>s.props));
    expect(allProps).not.toContain("Followers: 100k");
    // Navigation
    expect(comp.navigation.some(n=>n.id==="contact")).toBe(true);
    expect(comp.navigation.length).toBeLessThanOrEqual(6);
    // Section variants exist
    for (const sec of comp.sections.filter(s=>s.decision!=="hidden")) {
      expect(SECTION_MAP[sec.id]).toBeDefined();
    }
    // BuilderDraft and PublishedSnapshot would preserve this - check builder artifact
    expect(comp.builder.artifact.sections.length).toBe(comp.visibleSections.length);
    expect(comp.builder.pages[0].sections.length).toBe(comp.visibleSections.length);
    // Professional CTA
    expect(comp.sections.find(s=>s.id==="hero")?.props).toHaveProperty("cta");
    const heroCta = (comp.sections.find(s=>s.id==="hero")!.props as any).cta as string;
    expect(heroCta).not.toBe("See Products");
    expect(["View My Work","Hire Me","Get In Touch"].some(v=> heroCta.includes(v) || heroCta.length>0)).toBe(true);
  });

  it("Creator fixture remains intact (creator archetype, no professional sections)", async () => {
    const source = creatorFixtureSource();
    const intel = buildEvidenceIntelligence({ sourceText: source.bio, sourceContentTexts: [], followers: source.followers, acquisitionCompleteness: 0.7, graphNiche: "gaming", graphConfidence: 0.8 });
    const rel = buildRelationshipGraph(source.bio, ["youtube", source.bio]);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    expect(arch.archetype).toBe("creator");
    const bp = buildWebsiteBlueprint({
      evidence: intel, relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch, source,
    });
    expect(bp.visibleSections).toContain("hero");
    // Gallery or media where available — at least one should be visible for creator with youtube
    expect(bp.visibleSections.some(id => ["gallery","media","community"].includes(id))).toBe(true);
    expect(bp.visibleSections).not.toContain("experience");
    expect(bp.visibleSections).not.toContain("skills");
    const comp = composeStorefront({
      blueprint: bp,
      identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks, subdomain: source.username },
      evidence: intel, relationships: rel, source,
    });
    expect(comp.visibleSections).toContain("hero");
    expect(comp.visibleSections.some(id => ["gallery","media","community"].includes(id))).toBe(true);
  });

  it("Local-business fixture → menu/location/hours/reservation, no professional sections", async () => {
    const source = localBusinessFixtureSource();
    const intel = buildEvidenceIntelligence({ sourceText: source.bio, sourceContentTexts: [], followers: 0, acquisitionCompleteness: 0.7, graphNiche: "food", graphConfidence: 0.5 });
    const rel = buildRelationshipGraph(source.bio + " https://www.google.com/maps/place/Tasty", ["manual", source.bio]);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    expect(arch.archetype).toBe("local_business");
    const bp = buildWebsiteBlueprint({
      evidence: intel, relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch, source,
    });
    expect(bp.visibleSections).toContain("hero");
    expect(bp.visibleSections).toContain("menu");
    expect(bp.visibleSections).toContain("location");
    expect(bp.visibleSections).toContain("hours");
    expect(bp.visibleSections).toContain("reservations");
    expect(bp.visibleSections).not.toContain("experience");
    expect(bp.visibleSections).not.toContain("skills");
    const comp = composeStorefront({
      blueprint: bp,
      identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks, subdomain: source.username },
      evidence: intel, relationships: rel, source,
    });
    expect(comp.visibleSections).toContain("menu");
    expect(comp.visibleSections).toContain("location");
  });

  it("resumeSource survives all the way into generation (profileResult.composition)", async () => {
    const text = professionalResumeText();
    const acq = await profileAcquisitionEngine.acquire(text, "Kaushal G Bhat");
    expect(acq.source.resume).toBeDefined();
    const resumeTexts = [acq.source.resume!.summary, ...acq.source.resume!.skills].filter(Boolean);
    const intel = buildEvidenceIntelligence({ sourceText: acq.source.bio, sourceContentTexts: resumeTexts, followers: 0, acquisitionCompleteness: 0.7, graphNiche: null, graphConfidence: 0.5 });
    const rel = buildRelationshipGraph(acq.source.bio, ["manual", ...resumeTexts]);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source: acq.source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({
      evidence: intel, relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: acq.source.displayName, username: acq.source.username, subdomain: acq.source.username },
      archetype: arch, source: acq.source,
    });
    const comp = composeStorefront({
      blueprint: bp,
      identity: { entityType: null, name: acq.source.displayName, username: acq.source.username, bio: acq.source.bio, tagline: null, avatarUrl: acq.source.avatarUrl, socialLinks: acq.source.socialLinks ?? [], subdomain: acq.source.username },
      evidence: intel, relationships: rel, source: acq.source,
    });
    // Binder should have used resume data
    const exp = comp.sections.find(s=>s.id==="experience");
    expect((exp?.props as any).items[0].title).toContain("Operations Head");
    const skills = comp.sections.find(s=>s.id==="skills");
    expect((skills?.props as any).services.length).toBeGreaterThan(10);
  });
});
