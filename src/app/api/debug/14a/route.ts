import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { profileAcquisitionEngine } from "@/lib/generation/acquisition/engine";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { composeStorefront } from "@/lib/generation/intelligence/composition/engine";
import { isValidHttpUrl } from "@/lib/validation/url";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Load Kaushal PDF if exists locally (in Vercel it should exist as public asset)
    let text = "";
    try {
      const p = path.resolve(process.cwd(), "public/marketing-assets/Resume/Kaushal_Bhat_Resume (2).pdf");
      if (fs.existsSync(p)) {
        const { extractText } = await import("unpdf");
        const buf = fs.readFileSync(p);
        const r = await extractText(new Uint8Array(buf), { mergePages: true });
        text = (r.text as string) || "";
      }
    } catch {}
    if (!text) text = "KAUSHAL G BHAT\nFull-Stack Software Engineer | Architecture & AI Specialist\nPune, India\nPROFILE Full-stack software engineer specializing in TypeScript, Python...";

    const acq = await profileAcquisitionEngine.acquire(text, "Kaushal G Bhat");
    const source = acq.source;
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

    // Also fetch latest tenant builder info
    const latestTenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, subdomain: true, createdAt: true } });
    const latestWebsite = latestTenant ? await prisma.website.findUnique({ where: { tenantId: latestTenant.id }, select: { id: true } }) : null;
    let builderPages: any = null;
    if (latestWebsite) {
      try {
        const { BuilderService } = await import("@/lib/builder/builder-service");
        builderPages = await new BuilderService().load(latestWebsite.id);
      } catch {}
    }

    const socialChecks = {
      hasManualInLinks: (source.links ?? []).some((l) => l.includes("manual.com")),
      hasManualInSocial: (source.socialLinks ?? []).some((l) => l.includes("manual.com")),
      isValidManual: isValidHttpUrl("https://manual.com/anything"),
      isValidGithub: isValidHttpUrl("https://github.com/kaushalbhat0-personal"),
    };

    return NextResponse.json({
      ok: true,
      diagnostics: {
        hasResumeSource: !!source.resume,
        hasComposition: !!comp,
        hasBlueprint: !!bp,
        archetype: arch.archetype,
        compositionVersion: comp.version,
        blueprintVersion: bp.version,
        primaryEntity: intel.primaryEntity,
        entities: intel.entities.slice(0, 4).map((e) => ({ entity: e.entity, confidence: Number(e.confidence.toFixed(3)) })),
        visibleSections: bp.visibleSections,
        compVisible: comp.visibleSections,
        builderPagesCount: builderPages?.length ?? 0,
        builderSections: builderPages?.[0]?.sections?.map((s: any) => ({ name: s.name, moduleId: s.slots?.[0]?.moduleId })) ?? [],
        socialChecks,
        acquisitionDiagnostics: acq.diagnostics,
        sourceDisplayName: source.displayName,
        sourceUsername: source.username,
        resumeSkills: source.resume?.skills.length,
        resumeProjects: source.resume?.projects.length,
        latestTenant,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack?.slice(0, 2000) : "" }, { status: 500 });
  }
}
