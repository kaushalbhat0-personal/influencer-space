import { NextResponse } from "next/server";
import { profileAcquisitionEngine } from "@/lib/generation/acquisition/engine";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";

export async function GET() {
  const text = `KAUSHAL G BHAT
Full-Stack Software Engineer | Architecture & AI Specialist
Pune, India | +91 8668767875 | kaushalbhat0@gmail.com | github.com/kaushalbhat0-personal
PROFILE
Full-stack software engineer specializing in TypeScript, Python, and Dart/Flutter ecosystems with deep expertise in architecting multi-tenant SaaS platforms, AI integrations, and domain-driven systems.
TECHNICAL SKILLS
Languages: TypeScript, Python, Dart, SQL
Frontend: React 19, Next.js 16
State & Data: Zustand
Backend: FastAPI
EXPERIENCE
Operations Head — Money Craft Trader Jul 2025 – Present
WORK
PROJECTS
Legacy Modernization Platform — COBOL to NestJS
EDUCATION
Bachelor of Computer Science — Sinhgad College (2015 – 2019)
CERTIFICATIONS
AWS Certified`;
  try {
    const acq = await profileAcquisitionEngine.acquire(text, "Kaushal G Bhat");
    const source = acq.source;
    const resumeTexts = source.resume ? [source.resume.summary, ...source.resume.skills].filter(Boolean) : [];
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
    return NextResponse.json({
      hasResume: !!source.resume,
      hasComposition: true,
      archetype: arch.archetype,
      primaryEntity: intel.primaryEntity,
      entities: intel.entities.slice(0,3),
      diagnostics: acq.diagnostics,
      sourceLinks: source.links,
      sourceSocial: source.socialLinks,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
