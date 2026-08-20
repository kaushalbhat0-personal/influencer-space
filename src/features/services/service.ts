import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { ServiceData, ServiceFormInput } from "./types";

function toServiceData(o: {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: string;
  createdAt: Date;
  metadata: unknown;
  bookable?: boolean;
}): ServiceData {
  const meta = (o.metadata as Record<string, unknown> | null) ?? {};
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    price: o.price,
    duration: (meta.duration as string) ?? null,
    imageUrl: (meta.imageUrl as string) ?? null,
    category: (meta.category as string) ?? null,
    featured: (meta.featured as boolean) ?? false,
    status: (o.status === "published" ? "PUBLISHED" : "DRAFT") as ServiceData["status"],
    isActive: o.status === "published",
    createdAt: o.createdAt,
    bookable: o.bookable ?? false,
  };
}

export const serviceService = {
  async list(tenantId: string): Promise<ServiceData[]> {
    const offerings = await prisma.offering.findMany({
      where: { tenantId, type: "coaching" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, price: true, status: true, createdAt: true, metadata: true, bookable: true },
    });
    return offerings.map(toServiceData);
  },

  async create(tenantId: string, input: ServiceFormInput, tx?: Prisma.TransactionClient): Promise<ServiceData> {
    const client = tx ?? prisma;
    const slug = input.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const offering = await client.offering.create({
      data: {
        tenantId,
        type: "coaching",
        title: input.title,
        slug,
        description: input.description ?? null,
        price: input.price,
        status: input.status === "PUBLISHED" ? "published" : "draft",
        currency: "INR",
        bookable: input.bookable ?? false,
        metadata: JSON.parse(JSON.stringify({
          duration: input.duration ?? null,
          imageUrl: input.imageUrl ?? null,
          category: input.category ?? null,
          featured: input.featured ?? false,
        })),
      },
    });
    return toServiceData(offering);
  },

  async update(tenantId: string, id: string, input: ServiceFormInput, tx?: Prisma.TransactionClient): Promise<ServiceData> {
    const client = tx ?? prisma;
    const existing = await client.offering.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Service not found");

    const existingMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
    const offering = await client.offering.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description ?? null,
        price: input.price,
        status: input.status === "PUBLISHED" ? "published" : input.status === "ARCHIVED" ? "archived" : "draft",
        bookable: input.bookable ?? false,
        metadata: JSON.parse(JSON.stringify({
          ...existingMeta,
          duration: input.duration ?? null,
          imageUrl: input.imageUrl ?? null,
          category: input.category ?? null,
          featured: input.featured ?? existingMeta.featured ?? false,
        })),
      },
    });
    return toServiceData(offering);
  },

  /**
   * RCCF-72.16B — effective active-state transition for a service update, read
   * under the tenant lock. A service is ACTIVE when its Offering status is
   * `published` (the exact predicate used by the Launch counter).
   */
  async resolveUpdateTransition(
    tenantId: string,
    id: string,
    input: ServiceFormInput,
    tx?: Prisma.TransactionClient,
  ): Promise<{ wasActive: boolean; willBeActive: boolean }> {
    const client = tx ?? prisma;
    const existing = await client.offering.findFirst({ where: { id, tenantId }, select: { status: true } });
    if (!existing) throw new Error("Service not found");
    return {
      wasActive: existing.status === "published",
      willBeActive: input.status === "PUBLISHED",
    };
  },

  async delete(tenantId: string, id: string): Promise<void> {
    await prisma.offering.deleteMany({ where: { id, tenantId } });
  },
};
