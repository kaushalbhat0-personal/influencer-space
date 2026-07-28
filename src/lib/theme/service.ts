import { prisma } from "@/lib/prisma";
import { themePresetRegistry } from "./presets";
import type { ThemePreset } from "./presets";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toJson(val: Record<string, string | undefined | null>): any {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined && v !== null) clean[k] = v;
  }
  return clean;
}

export interface ThemeInput {
  packageId: string;
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  config?: Record<string, string>;
}

export class ThemeService {
  listPresets(): ThemePreset[] {
    return themePresetRegistry.getAll();
  }

  getPreset(id: string): ThemePreset | undefined {
    return themePresetRegistry.getById(id);
  }

  async getResolved(websiteId: string): Promise<ThemePreset | null>;
  async getResolved(website: { themePackageId: string; themeColors: unknown; themeFonts: unknown; themeConfig: unknown }): Promise<ThemePreset>;
  async getResolved(websiteOrId: string | { themePackageId: string; themeColors: unknown; themeFonts: unknown; themeConfig: unknown }): Promise<ThemePreset | null> {
    let website: { themePackageId: string; themeColors: unknown; themeFonts: unknown; themeConfig: unknown };

    if (typeof websiteOrId === "string") {
      const dbWebsite = await prisma.website.findUnique({ where: { id: websiteOrId } });
      if (!dbWebsite) return null;
      website = dbWebsite;
    } else {
      website = websiteOrId;
    }

    const preset = themePresetRegistry.getById(website.themePackageId);
    if (!preset) return themePresetRegistry.getDefault();

    const colors = website.themeColors as Record<string, string>;
    const fonts = website.themeFonts as Record<string, string>;
    const config = website.themeConfig as Record<string, string>;

    return {
      ...preset,
      colors: { ...preset.colors, ...colors },
      fonts: { ...preset.fonts, ...fonts },
      config: { ...preset.config, ...config },
    };
  }

  async apply(websiteId: string, input: ThemeInput): Promise<void> {
    const preset = themePresetRegistry.getById(input.packageId);
    if (!preset) throw new Error(`Theme preset "${input.packageId}" not found`);

    await prisma.website.update({
      where: { id: websiteId },
      data: {
        themePackageId: input.packageId,
        themeColors: toJson(input.colors || {}),
        themeFonts: toJson(input.fonts || {}),
        themeConfig: toJson(input.config || {}),
      },
    });
  }

  async overrideColors(websiteId: string, overrides: Record<string, string>): Promise<void> {
    const website = await prisma.website.findUnique({ where: { id: websiteId }, select: { themeColors: true } });
    if (!website) throw new Error("Website not found");
    const existing = website.themeColors as Record<string, string>;
    await prisma.website.update({
      where: { id: websiteId },
      data: { themeColors: toJson({ ...existing, ...overrides }) },
    });
  }

  toStyle(resolved: ThemePreset): Record<string, string> {
    return {
      "--brand-primary": resolved.colors.primary,
      "--brand-secondary": resolved.colors.secondary,
      "--brand-accent": resolved.colors.accent,
      "--brand-bg": resolved.colors.background,
      "--brand-text": resolved.colors.text,
      "--brand-font-heading": resolved.fonts.heading,
      "--brand-font-body": resolved.fonts.body,
      "--brand-radius": resolved.config.borderRadius || "8px",
    };
  }
}

export const themeService = new ThemeService();
