import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface CreateTenantData {
  name: string;
  subdomain: string;
  youtubeChannelId?: string;
}

export class TenantRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async create(data: CreateTenantData, tx?: Prisma.TransactionClient) {
    return this.client(tx).tenant.create({ data });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return this.client(tx).tenant.findUnique({ where: { id } });
  }

  async findBySubdomain(subdomain: string, tx?: Prisma.TransactionClient) {
    return this.client(tx).tenant.findUnique({ where: { subdomain } });
  }

  async exists(subdomain: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const tenant = await this.client(tx).tenant.findUnique({ where: { subdomain }, select: { id: true } });
    return tenant !== null;
  }
}

export const tenantRepository = new TenantRepository();
