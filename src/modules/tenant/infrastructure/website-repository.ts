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
    return this.client(tx).website.findUnique({
      where: { tenantId },
      include: { tenant: true },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return this.client(tx).website.findUnique({
      where: { id },
      include: { brand: true, publishStatus: true },
    });
  }

  async listAll(tx?: Prisma.TransactionClient) {
    return this.client(tx).website.findMany({
      include: { brand: true, publishStatus: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async listPublished(tx?: Prisma.TransactionClient) {
    return this.client(tx).website.findMany({
      where: { publishStatus: { state: "live" } },
      include: { brand: true, tenant: true, publishStatus: true },
      orderBy: { createdAt: "desc" },
    });
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

  async updateTheme(
    id: string,
    theme: {
      themeColors?: Record<string, string>;
      themeFonts?: Record<string, string>;
      themeConfig?: Record<string, string>;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).website.update({
      where: { id },
      data: theme,
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

  async findTheme(tenantId: string, tx?: Prisma.TransactionClient) {
    return this.client(tx).website.findUnique({
      where: { tenantId },
      select: { id: true, themePackageId: true, themeColors: true, themeFonts: true, themeConfig: true },
    });
  }
}

export const websiteRepository = new WebsiteRepository();
