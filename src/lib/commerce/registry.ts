import { prisma } from "@/lib/prisma";

export interface OfferingInput {
  type: string;
  title: string;
  slug: string;
  description?: string;
  price?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export class OfferingRegistry {
  async create(tenantId: string, input: OfferingInput): Promise<{ id: string }> {
    const offering = await prisma.offering.create({
      data: JSON.parse(JSON.stringify({
        tenantId,
        type: input.type,
        title: input.title,
        slug: input.slug,
        description: input.description || null,
        price: input.price ?? 0,
        currency: input.currency || "INR",
        metadata: input.metadata || {},
        status: "draft",
      })),
    });
    return { id: offering.id };
  }

  async update(offeringId: string, input: Partial<OfferingInput>): Promise<void> {
    const data = JSON.parse(JSON.stringify({
      ...(input.title && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.currency && { currency: input.currency }),
      ...(input.metadata && { metadata: input.metadata }),
      ...(input.type && { type: input.type }),
    }));
    await prisma.offering.update({ where: { id: offeringId }, data });
  }

  async publish(offeringId: string): Promise<void> {
    await prisma.offering.update({
      where: { id: offeringId },
      data: { status: "published" },
    });
  }

  async archive(offeringId: string): Promise<void> {
    await prisma.offering.update({
      where: { id: offeringId },
      data: { status: "archived" },
    });
  }

  async duplicate(offeringId: string, tenantId: string): Promise<{ id: string }> {
    const source = await prisma.offering.findUnique({ where: { id: offeringId } });
    if (!source) throw new Error("Offering not found");
    return this.create(tenantId, {
      type: source.type,
      title: `${source.title} (copy)`,
      slug: `${source.slug}-copy-${Date.now().toString(36)}`,
      description: source.description || undefined,
      price: source.price,
      currency: source.currency,
      metadata: source.metadata as Record<string, unknown>,
    });
  }

  async list(tenantId: string) {
    return prisma.offering.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listByType(tenantId: string, type: string) {
    return prisma.offering.findMany({
      where: { tenantId, type },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(offeringId: string) {
    return prisma.offering.findUnique({ where: { id: offeringId } });
  }

  async getBySlug(tenantId: string, slug: string) {
    return prisma.offering.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });
  }

  async listPublished(tenantId: string) {
    return prisma.offering.findMany({
      where: { tenantId, status: "published" },
      orderBy: { price: "asc" },
    });
  }

  async delete(offeringId: string): Promise<boolean> {
    const purchaseCount = await prisma.purchase.count({ where: { offeringId } });
    if (purchaseCount > 0) {
      throw new Error(`Offering ${offeringId} has ${purchaseCount} purchases. Archive instead of delete.`);
    }
    await prisma.offering.delete({ where: { id: offeringId } });
    return true;
  }
}

export const offeringRegistry = new OfferingRegistry();
