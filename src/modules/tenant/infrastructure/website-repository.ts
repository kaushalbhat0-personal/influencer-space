import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface CreateWebsiteData {
  tenantId: string;
  themePackageId?: string;
}

export class WebsiteRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async create(data: CreateWebsiteData, tx?: Prisma.TransactionClient) {
    return this.client(tx).website.create({
      data: {
        tenantId: data.tenantId,
        themePackageId: data.themePackageId ?? "neon-dark",
      },
    });
  }

  async findByTenantId(tenantId: string, tx?: Prisma.TransactionClient) {
    return this.client(tx).website.findUnique({ where: { tenantId } });
  }

  async updateThemeColors(
    id: string,
    colors: Record<string, string>,
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).website.update({
      where: { id },
      data: { themeColors: colors },
    });
  }

  async update(
    id: string,
    data: Record<string, unknown>,
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).website.update({
      where: { id },
      data,
    });
  }
}

export const websiteRepository = new WebsiteRepository();
