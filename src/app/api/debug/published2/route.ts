import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, subdomain: true } });
    if (!tenant) return NextResponse.json({ ok: false }, { status: 404 });
    const website = await prisma.website.findUnique({ where: { tenantId: tenant.id }, select: { id: true } });
    if (!website) return NextResponse.json({ ok: false }, { status: 404 });
    const pages = await prisma.page.findMany({ where: { websiteId: website.id }, include: { sections: { include: { slots: true } } } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = await (prisma as any).publishSnapshot.findFirst({ where: { websiteId: website.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({
      ok: true,
      tenant,
      pages: pages.map((p) => ({ name: p.name, slug: p.slug, sections: p.sections.map((s) => ({ name: s.name, slots: s.slots.map((sl) => ({ moduleId: (sl as unknown as { moduleId: string }).moduleId })) })) })),
      snapshotSections: snap ? (snap as unknown as { data: { layout?: { sections?: unknown[] } } }).data?.layout?.sections : null,
      snapshotKeys: snap ? Object.keys((snap as unknown as { data: object }).data) : null,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
