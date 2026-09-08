import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, subdomain: true } });
  if (!tenant) return NextResponse.json({ ok: false });
  const website = await prisma.website.findUnique({ where: { tenantId: tenant.id }, select: { id: true } });
  if (!website) return NextResponse.json({ ok: false });
  const pages = await prisma.page.findMany({ where: { websiteId: website.id }, include: { sections: { include: { blocks: true } } }, orderBy: { order: "asc" } });
  return NextResponse.json({
    ok: true,
    tenant,
    pages: pages.map((p) => ({
      name: p.name,
      slug: p.slug,
      sections: p.sections.map((s) => ({ name: s.name, blocks: s.blocks.map((b) => ({ moduleId: b.moduleId, config: b.config })) })),
    })),
  });
}
