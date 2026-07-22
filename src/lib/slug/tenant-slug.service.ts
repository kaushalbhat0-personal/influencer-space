import { prisma } from "@/lib/prisma";

export class TenantSlugService {
  async generate(baseName: string): Promise<string> {
    const slug = this.slugify(baseName);
    if (!slug) {
      throw new Error(`Cannot generate slug from "${baseName}"`);
    }

    const existing = await prisma.tenant.findUnique({
      where: { subdomain: slug },
      select: { id: true },
    });
    if (!existing) return slug;

    let counter = 2;
    while (true) {
      const candidate = `${slug}-${counter}`;
      const taken = await prisma.tenant.findUnique({
        where: { subdomain: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
      counter++;
    }
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  }
}

export const tenantSlugService = new TenantSlugService();
