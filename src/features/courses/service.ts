import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { CourseData, CourseFormInput } from "./types";

function toCourseData(o: {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: string;
  createdAt: Date;
  metadata: unknown;
}): CourseData {
  const meta = (o.metadata as Record<string, unknown> | null) ?? {};
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    price: o.price,
    imageUrl: (meta.imageUrl as string) ?? null,
    category: (meta.category as string) ?? null,
    featured: (meta.featured as boolean) ?? false,
    status: (o.status === "published" ? "PUBLISHED" : "DRAFT") as CourseData["status"],
    moduleCount: 0,
    lessonCount: 0,
    createdAt: o.createdAt,
  };
}

export const courseService = {
  async list(tenantId: string): Promise<CourseData[]> {
    const offerings = await prisma.offering.findMany({
      where: { tenantId, type: "course" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, price: true, status: true, createdAt: true, metadata: true },
    });
    return offerings.map(toCourseData);
  },

  async getById(tenantId: string, id: string): Promise<CourseData | null> {
    // RCCF-63.3 — tenant-authoritative read. A course id is only an object
    // identifier; the authenticated tenant is required so a foreign-tenant
    // course is never returned (no existence leak).
    const o = await prisma.offering.findFirst({
      where: { id, tenantId, type: "course" },
      select: { id: true, title: true, description: true, price: true, status: true, createdAt: true, metadata: true },
    });
    if (!o) return null;
    return toCourseData(o);
  },

  async create(tenantId: string, input: CourseFormInput, tx?: Prisma.TransactionClient): Promise<CourseData> {
    const client = tx ?? prisma;
    const slug = input.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const offering = await client.offering.create({
      data: {
        tenantId,
        type: "course",
        title: input.title,
        slug,
        description: input.description ?? null,
        price: input.price,
        status: input.status === "PUBLISHED" ? "published" : "draft",
        currency: "INR",
        metadata: JSON.parse(JSON.stringify({
          imageUrl: input.imageUrl ?? null,
          category: input.category ?? null,
          featured: input.featured ?? false,
        })),
      },
    });
    return toCourseData(offering);
  },

  async update(tenantId: string, id: string, input: CourseFormInput, tx?: Prisma.TransactionClient): Promise<CourseData> {
    const client = tx ?? prisma;
    const existing = await client.offering.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Course not found");

    const existingMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
    const offering = await client.offering.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description ?? null,
        price: input.price,
        status: input.status === "PUBLISHED" ? "published" : input.status === "ARCHIVED" ? "archived" : "draft",
        metadata: JSON.parse(JSON.stringify({
          ...existingMeta,
          imageUrl: input.imageUrl ?? null,
          category: input.category ?? null,
          featured: input.featured ?? existingMeta.featured ?? false,
        })),
      },
    });
    return toCourseData(offering);
  },

  /**
   * RCCF-72.16B — effective active-state transition for a course update, read
   * under the tenant lock. A course is ACTIVE when its Offering status is
   * `published` (the exact predicate used by the Launch counter).
   */
  async resolveUpdateTransition(
    tenantId: string,
    id: string,
    input: CourseFormInput,
    tx?: Prisma.TransactionClient,
  ): Promise<{ wasActive: boolean; willBeActive: boolean }> {
    const client = tx ?? prisma;
    const existing = await client.offering.findFirst({ where: { id, tenantId }, select: { status: true } });
    if (!existing) throw new Error("Course not found");
    return {
      wasActive: existing.status === "published",
      willBeActive: input.status === "PUBLISHED",
    };
  },

  async delete(tenantId: string, id: string): Promise<void> {
    // RCCF-63.3 — verify ownership before mutation and report truthfully.
    // A foreign or nonexistent course is "not found" (no existence leak).
    const existing = await prisma.offering.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Course not found");
    await prisma.offering.delete({ where: { id } });
  },
};
