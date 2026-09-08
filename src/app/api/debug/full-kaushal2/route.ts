/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { profileAcquisitionEngine } from "@/lib/generation/acquisition/engine";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { composeStorefront } from "@/lib/generation/intelligence/composition/engine";

export async function GET() {
  try {
    let text = "";
    try {
      const p = path.resolve(process.cwd(), "full-text.json");
      if (fs.existsSync(p)) {
        text = JSON.parse(fs.readFileSync(p, "utf-8"));
      }
    } catch {}
    if (!text || text.length < 100) {
      const pdfPath = path.resolve(process.cwd(), "public/marketing-assets/Resume/Kaushal_Bhat_Resume (2).pdf");
      if (fs.existsSync(pdfPath)) {
        const { extractResumeText } = await import("@/lib/resume/extract");
        const buf = fs.readFileSync(pdfPath);
        text = await extractResumeText(buf, "application/pdf");
      }
    }
    if (!text || text.length < 100) return NextResponse.json({ ok: false, error: "no text", textLen: text.length }, { status: 500 });
    const acq = await profileAcquisitionEngine.acquire(text, "Kaushal G Bhat");
    const source = acq.source;
    const resumeTexts = source.resume
      ? [source.resume.summary, ...source.resume.skills, ...source.resume.experience.map((e: any) => e.title + " " + (e.company || "") + " " + e.description), ...source.resume.projects.map((p: any) => p.name + " " + p.description)].filter(Boolean) as string[]
      : [];
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
    const arch = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.7, populatedFields: acq.diagnostics.populatedFields, missingFields: acq.diagnostics.missingFields },
    });
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
      ok: true,
      hasResume: !!source.resume,
      archetype: arch.archetype,
      confidence: arch.confidence,
      primaryEntity: intel.primaryEntity,
      visible: bp.visibleSections,
      compVisible: comp.visibleSections,
      heroModule: comp.sections.find((s) => s.id === "hero")?.moduleId,
      theme: comp.theme.themeId,
      textLen: text.length,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack?.slice(0, 2000) : "" }, { status: 500 });
  }
}
