import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, subdomain: true } });
    if (!tenant) return NextResponse.json({ ok: false }, { status: 404 });
    const website = await prisma.website.findUnique({ where: { tenantId: tenant.id }, select: { id: true } });
    if (!website) return NextResponse.json({ ok: false }, { status: 404 });
    const snapshot = await prisma.publishedSnapshot.findFirst({ where: { websiteId: website.id }, orderBy: { createdAt: "desc" } });
    const pages = await prisma.page.findMany({ where: { websiteId: website.id }, include: { sections: { include: { slots: true } } } });
    return NextResponse.json({
      ok: true,
      tenant,
      websiteId: website.id,
      snapshot: snapshot ? { id: snapshot.id, data: (snapshot as unknown as { data: unknown }).data } : null,
      pages: pages.map((p) => ({ name: p.name, slug: p.slug, sections: p.sections.map((s) => ({ name: s.name, slots: s.slots.map((sl) => ({ moduleId: sl.moduleId, configKeys: Object.keys((sl.config as object) || {}) })) })) })),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
