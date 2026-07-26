import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface SettingEntry {
  key: string;
  value: unknown;
}

export class WebsiteSettingsRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async upsert(
    tenantId: string,
    key: string,
    value: unknown,
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).setting.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { value: value as never },
      create: { tenantId, key, value: value as never },
    });
  }

  async createBatch(
    tenantId: string,
    entries: SettingEntry[],
    tx?: Prisma.TransactionClient,
  ) {
    const c = this.client(tx);
    for (const entry of entries) {
      await c.setting.create({
        data: {
          tenantId,
          key: entry.key,
          value: entry.value as never,
        },
      });
    }
  }
}

export const websiteSettingsRepository = new WebsiteSettingsRepository();
