import { prisma } from "@/lib/prisma";
import type { InfluencerDataType } from "@/config/influencer";
import { defaultConfig } from "@/config/influencer";
import type { Prisma } from "@/generated/prisma/client";

export const SettingsService = {
  async get(key: string): Promise<unknown> {
    const setting = await prisma.setting.findUnique({
      where: { key },
    });
    return setting?.value ?? null;
  },

  async set(key: string, value: Prisma.InputJsonValue): Promise<void> {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  },

  async getInfluencerData(): Promise<InfluencerDataType> {
    const data = await this.get("influencer_data");
    if (data) {
      return data as InfluencerDataType;
    }
    await this.set("influencer_data", defaultConfig as Prisma.InputJsonValue);
    return defaultConfig;
  },

  async updateInfluencerData(data: InfluencerDataType): Promise<void> {
    await this.set("influencer_data", data as Prisma.InputJsonValue);
  },
};
