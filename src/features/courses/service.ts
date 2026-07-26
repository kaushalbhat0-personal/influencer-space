import { prisma } from "@/lib/prisma";
import type { CourseData, CourseFormInput } from "./types";

export const courseService = {
  async list(tenantId: string): Promise<CourseData[]> {
    const offerings = await prisma.offering.findMany({
      where: { tenantId, type: "course" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, status: true, createdAt: true },
    });
    return offerings.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      status: (o.status === "published" ? "PUBLISHED" : "DRAFT") as CourseData["status"],
      moduleCount: 0,
      lessonCount: 0,
      createdAt: o.createdAt,
    }));
  },

  async getById(id: string): Promise<CourseData | null> {
    const o = await prisma.offering.findUnique({
      where: { id },
      select: { id: true, title: true, description: true, status: true, createdAt: true },
    });
    if (!o) return null;
    return {
      id: o.id,
      title: o.title,
      description: o.description,
      status: (o.status === "published" ? "PUBLISHED" : "DRAFT") as CourseData["status"],
      moduleCount: 0,
      lessonCount: 0,
      createdAt: o.createdAt,
    };
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
        price: 0,
        status: input.status === "PUBLISHED" ? "published" : "draft",
        currency: "INR",
      },
    });
    return {
      id: offering.id,
      title: offering.title,
      description: offering.description,
      status: (offering.status === "published" ? "PUBLISHED" : "DRAFT") as CourseData["status"],
      moduleCount: 0,
      lessonCount: 0,
      createdAt: offering.createdAt,
    };
  },
};
