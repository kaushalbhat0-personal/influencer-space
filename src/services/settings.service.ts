import { prisma } from "@/lib/prisma";
import type { HeroDataType } from "@/config/hero";
import { defaultHeroData } from "@/config/hero";
import type { Prisma } from "@/generated/prisma/client";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";

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
      captureError(error, { service: "settings-service", operation: "getSettingByKey" });
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
      captureError(error, { service: "settings-service", operation: "getAllSettings" });
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
      captureError(error, { service: "settings-service", operation: "upsertSetting" });
      throw error;
    }
  },

  async getHeroData(tenantId: string): Promise<HeroDataType> {
    try {
      const data = await SettingsService.getSettingByKey(tenantId, "hero_data");
      if (data) return { ...defaultHeroData, ...(data as Partial<HeroDataType>) };
    } catch (err) {
      captureError(err, { service: "settings-service", operation: "getHeroData" });
    }

    await SettingsService.upsertSetting(
      tenantId,
      "hero_data",
      defaultHeroData as unknown as Prisma.InputJsonValue,
    ).catch((err) => { captureError(err, { service: "settings-service", operation: "getHeroData-upsert" }); });

    return defaultHeroData;
  },

  async updateHeroData(tenantId: string, data: HeroDataType): Promise<void> {
    await SettingsService.upsertSetting(
      tenantId,
      "hero_data",
      data as unknown as Prisma.InputJsonValue,
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
         "value" = (COALESCE("Setting"."value", '{}'::jsonb) || EXCLUDED."value")
           - ARRAY(SELECT "k"::text
              FROM jsonb_each(EXCLUDED."value") AS kv("k", "v")
              WHERE kv."v" = 'null'::jsonb),
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

  /**
   * Clear a single integration's configuration on the Tenant.
   * Platform-scoped — never touches unrelated Tenant fields (hero, social
   * links, OAuth tokens for other providers, etc.).
   */
  async clearTenantIntegration(
    tenantId: string,
    platform: "youtube" | "instagram",
  ): Promise<void> {
    const data =
      platform === "youtube"
        ? { youtubeApiKey: null, youtubeChannelId: null }
        : { instagramApiKey: null };

    await prisma.tenant.update({
      where: { id: tenantId },
      data,
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
