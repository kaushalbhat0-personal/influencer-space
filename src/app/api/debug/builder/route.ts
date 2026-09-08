import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const latestTenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, subdomain: true, createdAt: true } });
    if (!latestTenant) return NextResponse.json({ ok: false, error: "no tenant" }, { status: 404 });
    const website = await prisma.website.findUnique({ where: { tenantId: latestTenant.id }, select: { id: true, themePackageId: true } });
    if (!website) return NextResponse.json({ ok: false, error: "no website", tenant: latestTenant }, { status: 404 });
    const pages = await prisma.page.findMany({ where: { websiteId: website.id }, include: { sections: { include: { slots: true } } }, orderBy: { order: "asc" } });
    const settings = await prisma.setting.findMany({ where: { tenantId: latestTenant.id, key: { in: ["builder_artifact", "onboarding_source"] } } });
    const builderArtifact = settings.find((s) => s.key === "builder_artifact")?.value as any;
    return NextResponse.json({
      ok: true,
      tenant: latestTenant,
      website,
      pages: pages.map((p) => ({ id: p.id, name: p.name, slug: p.slug, sections: p.sections.map((s) => ({ name: s.name, slots: s.slots.map((sl) => ({ moduleId: sl.moduleId, config: sl.config })) })) })),
      builderArtifact: builderArtifact ? { sections: builderArtifact.sections?.slice(0, 3), navigation: builderArtifact.navigation, theme: builderArtifact.theme } : null,
      builderArtifactFullSections: builderArtifact?.sections?.map((s: any) => ({ id: s.id, type: s.type })) ?? [],
      builderArtifactVisible: builderArtifact?.sections?.map((s: any) => s.id) ?? [],
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
