import { prisma } from "@/lib/prisma";
import type { InfluencerDataType } from "@/config/influencer";
import { defaultConfig } from "@/config/influencer";
import type { HeroDataType } from "@/config/hero";
import { defaultHeroData } from "@/config/hero";
import type { Prisma } from "@/generated/prisma/client";

type SqlExecutor = {
  $executeRawUnsafe: (query: string, ...params: unknown[]) => Promise<number>;
};

export const SettingsService = {
  async getSettingByKey(tenantId: string, key: string): Promise<unknown> {
    try {
      const setting = await prisma.setting.findUnique({
        where: { tenantId_key: { tenantId, key } },
      });
      return setting?.value ?? null;
    } catch (error) {
      console.error("SettingsService.getSettingByKey error:", error);
      return null;
    }
  },

  async getAllSettings(tenantId: string): Promise<Record<string, unknown>> {
    try {
      const rows = await prisma.setting.findMany({
        where: { tenantId },
      });
      const result: Record<string, unknown> = {};
      for (const row of rows) {
        result[row.key] = row.value;
      }
      return result;
    } catch (error) {
      console.error("SettingsService.getAllSettings error:", error);
      return {};
    }
  },

  async upsertSetting(
    tenantId: string,
    key: string,
    value: Prisma.InputJsonValue,
  ): Promise<void> {
    try {
      await prisma.setting.upsert({
        where: { tenantId_key: { tenantId, key } },
        update: { value },
        create: { tenantId, key, value },
      });
    } catch (error) {
      console.error("SettingsService.upsertSetting error:", error);
      throw error;
    }
  },

  async getInfluencerData(tenantId: string): Promise<InfluencerDataType> {
    try {
      const data = await SettingsService.getSettingByKey(tenantId, "influencer_data");
      if (data) return data as InfluencerDataType;
    } catch (err) {
      console.error("SettingsService.getInfluencerData error:", err);
    }

    await SettingsService.upsertSetting(
      tenantId,
      "influencer_data",
      defaultConfig as Prisma.InputJsonValue,
    ).catch((err) => { console.error("SettingsService.getInfluencerData upsert error:", err); });

    return defaultConfig;
  },

  async updateInfluencerData(
    tenantId: string,
    data: InfluencerDataType,
  ): Promise<void> {
    await SettingsService.upsertSetting(
      tenantId,
      "influencer_data",
      data as Prisma.InputJsonValue,
    );
  },

  async getHeroData(tenantId: string): Promise<HeroDataType> {
    try {
      const data = await SettingsService.getSettingByKey(tenantId, "hero_data");
      if (data) return { ...defaultHeroData, ...(data as Partial<HeroDataType>) };
    } catch (err) {
      console.error("SettingsService.getHeroData error:", err);
    }

    await SettingsService.upsertSetting(
      tenantId,
      "hero_data",
      defaultHeroData as Prisma.InputJsonValue,
    ).catch((err) => { console.error("SettingsService.getHeroData upsert error:", err); });

    return defaultHeroData;
  },

  async updateHeroData(tenantId: string, data: HeroDataType): Promise<void> {
    await SettingsService.upsertSetting(
      tenantId,
      "hero_data",
      data as Prisma.InputJsonValue,
    );
  },

  async patchHeroData(
    tenantId: string,
    updates: Record<string, unknown>,
    tx?: SqlExecutor,
  ): Promise<void> {
    const client = tx || prisma;
    const jsonString = JSON.stringify(updates);
    await client.$executeRawUnsafe(
      `INSERT INTO "Setting" ("id", "tenantId", "key", "value", "updatedAt")
       VALUES (gen_random_uuid(), $1, 'hero_data', $2::jsonb, NOW())
       ON CONFLICT ("tenantId", "key")
       DO UPDATE SET
         "value" = COALESCE("Setting"."value", '{}'::jsonb) || EXCLUDED."value",
         "updatedAt" = NOW()`,
      tenantId,
      jsonString,
    );
  },

  async updateTenantChannels(
    tenantId: string,
    data: { youtubeChannelId?: string; twitchChannelId?: string },
  ): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(data.youtubeChannelId !== undefined && { youtubeChannelId: data.youtubeChannelId }),
        ...(data.twitchChannelId !== undefined && { twitchChannelId: data.twitchChannelId }),
      },
    });
  },

  /**
   * @deprecated Use platform.theme.transaction (ThemeTransactionManager) instead.
   *   This legacy method writes to the theme_config Setting key via JSONB patch.
   *   Migrate to themeAdapter.updateThemeConfig() for unified theme editing.
   */
  async patchThemeConfig(
    tenantId: string,
    updates: Record<string, unknown>,
    tx?: SqlExecutor,
  ): Promise<void> {
    const client = tx || prisma;
    const jsonString = JSON.stringify(updates);
    await client.$executeRawUnsafe(
      `INSERT INTO "Setting" ("id", "tenantId", "key", "value", "updatedAt")
       VALUES (gen_random_uuid(), $1, 'theme_config', $2::jsonb, NOW())
       ON CONFLICT ("tenantId", "key")
       DO UPDATE SET
         "value" = COALESCE("Setting"."value", '{}'::jsonb) || EXCLUDED."value",
         "updatedAt" = NOW()`,
      tenantId,
      jsonString,
    );
  },

  async getThemeConfig(tenantId: string): Promise<Record<string, unknown>> {
    try {
      const data = await SettingsService.getSettingByKey(tenantId, "theme_config");
      if (data) return data as Record<string, unknown>;
    } catch {}
    return {};
  },

  async updateTenantApiKeys(
    tenantId: string,
    data: { youtubeApiKey?: string; instagramApiKey?: string },
  ): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(data.youtubeApiKey !== undefined && { youtubeApiKey: data.youtubeApiKey }),
        ...(data.instagramApiKey !== undefined && { instagramApiKey: data.instagramApiKey }),
      },
    });
  },

  async getWorkspaceSettings(tenantId: string): Promise<{
    workspaceName: string;
    locale: string;
    timezone: string;
    currency: string;
    language: string;
    notifications: Record<string, boolean>;
  }> {
    const [tenant, workspace] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      prisma.workspace.findUnique({ where: { tenantId } }),
    ]);
    return {
      workspaceName: workspace?.name ?? tenant?.name ?? "",
      locale: workspace?.locale ?? "en-IN",
      timezone: workspace?.timezone ?? "Asia/Kolkata",
      currency: workspace?.currency ?? "INR",
      language: workspace?.locale ?? "en",
      notifications: { email: true, push: true, orderUpdates: true, marketing: false },
    };
  },

  async updateWorkspaceSettings(
    tenantId: string,
    input: {
      workspaceName?: string;
      locale?: string;
      timezone?: string;
      currency?: string;
    },
  ): Promise<void> {
    const workspace = await prisma.workspace.findUnique({ where: { tenantId } });
    if (!workspace) return;
    const updateData: Record<string, unknown> = {};
    if (input.workspaceName !== undefined) updateData.name = input.workspaceName;
    if (input.locale !== undefined) updateData.locale = input.locale;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (Object.keys(updateData).length > 0) {
      await prisma.workspace.update({ where: { id: workspace.id }, data: updateData });
    }
  },

  async getSeo(tenantId: string): Promise<{ title: string; description: string } | null> {
    const data = await SettingsService.getSettingByKey(tenantId, "seo");
    if (data && typeof data === "object") {
      return data as { title: string; description: string };
    }
    return null;
  },
};
