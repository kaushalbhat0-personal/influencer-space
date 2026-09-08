import { NextResponse } from "next/server";
import { onboardingService } from "@/lib/onboarding/service";

export async function GET() {
  try {
    // Fetch the PDF via public URL and extract, or use hardcoded fallback
    let text = "";
    try {
      const res = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://influencer-space-alpha.vercel.app"}/marketing-assets/Resume/Kaushal_Bhat_Resume%20(2).pdf`);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const { extractResumeText } = await import("@/lib/resume/extract");
        text = await extractResumeText(buf, "application/pdf");
      }
    } catch {}
    if (!text || text.length < 100) {
      text = `KAUSHAL G BHAT
Full-Stack Software Engineer | Architecture & AI Specialist
Pune, India | +91 8668767875 | kaushalbhat0@gmail.com | github.com/kaushalbhat0-personal
PROFILE
Full-stack software engineer specializing in TypeScript, Python, and Dart/Flutter ecosystems with deep expertise in architecting multi-tenant SaaS platforms, AI integrations, and domain-driven systems. Proven track record of delivering end-to-end products across healthcare, e-commerce, logistics, fintech, and mobile domains.
TECHNICAL SKILLS
Languages: TypeScript, Python, Dart, SQL
Frontend: React 19, Next.js 16, Flutter
EXPERIENCE
Operations Head — Money Craft Trader Jul 2025 – Present
Led platform modernization for healthcare clinic management with medical records.
PROJECTS
Healthcare Clinic Platform — Medical healthcare patient portal with clinic scheduling, healthcare analytics, medical records
Legacy Modernization Platform — COBOL to NestJS
EDUCATION
Bachelor of Computer Science — Sinhgad College (2015 – 2019)
CERTIFICATIONS
AWS Certified`;
    }
    const result = await onboardingService.importProfile(text, "debug-creator", "Kaushal G Bhat");
    return NextResponse.json({
      ok: true,
      hasResume: !!result.identityProfile,
      diagnostics: result.diagnostics,
      hasBlueprint: !!result.blueprint,
      hasComposition: !!result.composition,
      blueprintVisible: result.blueprint?.visibleSections ?? [],
      compVisible: result.composition?.visibleSections ?? [],
      heroModule: result.composition?.sections.find((s) => s.id === "hero")?.moduleId,
      theme: result.composition?.theme.themeId,
      primaryEntity: result.identityProfile?.intelligence?.primaryEntity,
      entities: result.identityProfile?.intelligence?.entities.slice(0, 4).map((e) => ({ e: e.entity, c: Number(e.confidence.toFixed(2)) })),
      sourceDisplayName: result.knowledgeGraph.creator.name,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack?.slice(0, 2000) : "" }, { status: 500 });
  }
}
