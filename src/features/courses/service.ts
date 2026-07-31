import { prisma } from "@/lib/prisma";
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

  async getById(id: string): Promise<CourseData | null> {
    const o = await prisma.offering.findUnique({
      where: { id },
      select: { id: true, title: true, description: true, price: true, status: true, createdAt: true, metadata: true },
    });
    if (!o) return null;
    return toCourseData(o);
  },

  async create(tenantId: string, input: CourseFormInput): Promise<CourseData> {
    const slug = input.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const offering = await prisma.offering.create({
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
        })),
      },
    });
    return toCourseData(offering);
  },

  async update(tenantId: string, id: string, input: CourseFormInput): Promise<CourseData> {
    const existing = await prisma.offering.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Course not found");

    const existingMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
    const offering = await prisma.offering.update({
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
        })),
      },
    });
    return toCourseData(offering);
  },

  async delete(tenantId: string, id: string): Promise<void> {
    await prisma.offering.deleteMany({ where: { id, tenantId } });
  },
};
