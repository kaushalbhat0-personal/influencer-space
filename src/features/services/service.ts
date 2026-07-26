import { prisma } from "@/lib/prisma";
import type { ServiceData, ServiceFormInput } from "./types";

export const serviceService = {
  async list(tenantId: string): Promise<ServiceData[]> {
    const offerings = await prisma.offering.findMany({
      where: { tenantId, type: "coaching" },
      orderBy: { createdAt: "desc" },
    });
    return offerings.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      price: o.price,
      duration: null,
      status: (o.status.toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT") as ServiceData["status"],
      isActive: o.status === "published",
      order: 0,
      createdAt: o.createdAt,
    }));
  },

  async create(tenantId: string, input: ServiceFormInput): Promise<ServiceData> {
    const slug = input.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const offering = await prisma.offering.create({
      data: {
        tenantId,
        type: "coaching",
        title: input.title,
        slug,
        description: input.description ?? null,
        price: input.price,
        status: input.status === "PUBLISHED" ? "published" : "draft",
        currency: "INR",
      },
    });
    return {
      id: offering.id,
      title: offering.title,
      description: offering.description,
      price: offering.price,
      duration: null,
      status: (offering.status === "published" ? "PUBLISHED" : "DRAFT") as ServiceData["status"],
      isActive: offering.status === "published",
      order: 0,
      createdAt: offering.createdAt,
    };
  },
};
