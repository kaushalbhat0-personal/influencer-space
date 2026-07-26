import { prisma } from "@/lib/prisma";
import type { SettingsData, SettingsFormInput } from "./types";

export const settingsService = {
  async get(tenantId: string): Promise<SettingsData> {
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
      notifications: {
        email: true,
        push: true,
        orderUpdates: true,
        marketing: false,
      },
    };
  },

  async update(tenantId: string, input: SettingsFormInput): Promise<SettingsData> {
    const workspace = await prisma.workspace.findUnique({ where: { tenantId } });
    if (workspace) {
      const updateData: Record<string, unknown> = {};
      if (input.workspaceName !== undefined) updateData.name = input.workspaceName;
      if (input.locale !== undefined) updateData.locale = input.locale;
      if (input.timezone !== undefined) updateData.timezone = input.timezone;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (Object.keys(updateData).length > 0) {
        await prisma.workspace.update({ where: { id: workspace.id }, data: updateData });
      }
    }
    return this.get(tenantId);
  },
};
