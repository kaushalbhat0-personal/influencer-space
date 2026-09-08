import { NextResponse } from "next/server";
import { profileAcquisitionEngine } from "@/lib/generation/acquisition/engine";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { composeStorefront } from "@/lib/generation/intelligence/composition/engine";

export async function GET() {
  const healthcareResume = `KAUSHAL G BHAT
Full-Stack Software Engineer | Architecture & AI Specialist
Pune, India | +91 8668767875 | kaushalbhat0@gmail.com | github.com/kaushalbhat0-personal
PROFILE
Full-stack software engineer specializing in TypeScript, Python, and Dart/Flutter ecosystems with deep expertise in architecting multi-tenant SaaS platforms, AI integrations, and domain-driven systems. Proven track record of delivering end-to-end products across healthcare, e-commerce, logistics, fintech, and mobile domains.
TECHNICAL SKILLS
Languages: TypeScript, Python, Dart, SQL
Frontend: React 19, Next.js 16, Flutter
Backend: FastAPI, Flask
EXPERIENCE
Operations Head — Money Craft Trader Jul 2025 – Present
Led platform modernization for healthcare clinic management.
Senior Engineer — HealthTech Solutions Jan 2023 – Jun 2025
Built healthcare patient portal with clinic scheduling and medical records.
PROJECTS
Healthcare Clinic Platform — Medical healthcare patient portal with clinic scheduling, healthcare analytics, medical records
E-Commerce Healthcare Store — Healthcare e-commerce with medical product catalog, clinic inventory
Legacy Modernization Platform — COBOL to NestJS with TypeScript
Milk Delivery Platform — Logistics with Google Maps integration
EDUCATION
Bachelor of Computer Science — Sinhgad College (2015 – 2019)
Master of Computer Science — Pune University (2019 – 2021)
CERTIFICATIONS
AWS Certified Solutions Architect`;
  try {
    const acq = await profileAcquisitionEngine.acquire(healthcareResume, "Kaushal G Bhat");
    const source = acq.source;
    const resumeTexts = source.resume ? [source.resume.summary, ...source.resume.skills, ...source.resume.experience.map((e)=>e.title+\" \"+(e.company||\"\")+\" \"+e.description), ...source.resume.projects.map((p)=>p.name+\" \"+p.description)].filter(Boolean) as string[] : [];
    const intel = buildEvidenceIntelligence({
      sourceText: source.bio ?? "",
      sourceContentTexts: resumeTexts,
      followers: 0,
      acquisitionCompleteness: 0.7,
      graphNiche: null,
      graphConfidence: 0.5,
      resume: source.resume ?? null,
    });
    const rel = buildRelationshipGraph(source.bio ?? "", ["manual", ...resumeTexts]);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: acq.diagnostics.populatedFields, missingFields: acq.diagnostics.missingFields } });
    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch,
      source,
    });
    const comp = composeStorefront({
      blueprint: bp,
      identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username },
      evidence: intel,
      relationships: rel,
      source,
    });
    return NextResponse.json({
      hasResume: !!source.resume,
      archetype: arch.archetype,
      confidence: arch.confidence,
      primaryEntity: intel.primaryEntity,
      entities: intel.entities.slice(0,4).map((e)=>({entity:e.entity, conf: Number(e.confidence.toFixed(3))})),
      visibleSections: bp.visibleSections,
      compVisible: comp.visibleSections,
      heroModule: comp.sections.find((s)=>s.id===\"hero\")?.moduleId,
      theme: comp.theme.themeId,
      diagnostics: acq.diagnostics.populatedFields,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack?.slice(0,1500) : "" }, { status: 500 });
  }
}
