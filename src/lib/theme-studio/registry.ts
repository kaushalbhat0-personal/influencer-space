import { prisma } from "@/lib/prisma";
import { DEFAULT_TOKENS, DARK_TOKENS } from "./tokens";
import type { DesignTokens } from "./tokens";

export interface ThemeInput {
  name: string;
  description?: string;
  mode?: "light" | "dark" | "auto";
  tokens?: Partial<DesignTokens>;
}

export class ThemeRegistry {
  async create(tenantId: string, input: ThemeInput): Promise<{ id: string }> {
    const baseTokens = this.mergeTokens(input.tokens || {}, input.mode);
    const theme = await prisma.designTheme.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description || null,
        mode: input.mode || "light",
        tokens: JSON.parse(JSON.stringify(baseTokens)),
      },
    });
    return { id: theme.id };
  }

  async activate(themeId: string, tenantId: string): Promise<void> {
    await prisma.designTheme.updateMany({
      where: { tenantId, active: true },
      data: { active: false },
    });
    await prisma.designTheme.update({
      where: { id: themeId },
      data: { active: true },
    });
  }

  async duplicate(themeId: string, tenantId: string, newName?: string): Promise<{ id: string }> {
    const source = await prisma.designTheme.findUnique({ where: { id: themeId } });
    if (!source) throw new Error("Theme not found");
    return this.create(tenantId, {
      name: newName || `${source.name} (copy)`,
      description: source.description || undefined,
      mode: source.mode as "light" | "dark" | "auto",
      tokens: JSON.parse(JSON.stringify(source.tokens)),
    });
  }

  async export(themeId: string): Promise<Record<string, unknown> | null> {
    const theme = await prisma.designTheme.findUnique({ where: { id: themeId } });
    if (!theme) return null;
    return JSON.parse(JSON.stringify({
      name: theme.name,
      description: theme.description,
      mode: theme.mode,
      tokens: theme.tokens,
    }));
  }

  async import(tenantId: string, data: Record<string, unknown>): Promise<{ id: string }> {
    return this.create(tenantId, {
      name: data.name as string || "Imported Theme",
      description: data.description as string | undefined,
      mode: data.mode as "light" | "dark" | "auto" | undefined,
      tokens: JSON.parse(JSON.stringify(data.tokens)),
    });
  }

  async list(tenantId: string) {
    return prisma.designTheme.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, description: true, mode: true, active: true, createdAt: true, updatedAt: true },
    });
  }

  async getActive(tenantId: string): Promise<{ id: string; name: string; mode: string; tokens: DesignTokens } | null> {
    const theme = await prisma.designTheme.findFirst({
      where: { tenantId, active: true },
    });
    if (!theme) return null;
    const merged = this.mergeTokens(JSON.parse(JSON.stringify(theme.tokens)), theme.mode as "light" | "dark" | "auto");
    return { id: theme.id, name: theme.name, mode: theme.mode, tokens: merged };
  }

  private mergeTokens(overrides: Partial<DesignTokens>, mode?: string): DesignTokens {
    const base = mode === "dark" ? this.deepMerge(DEFAULT_TOKENS, DARK_TOKENS) : DEFAULT_TOKENS;
    return this.deepMerge(base, overrides);
  }

  private deepMerge(base: DesignTokens, override: Partial<DesignTokens>): DesignTokens {
    return {
      colors: { ...base.colors, ...override.colors },
      typography: { ...base.typography, ...override.typography },
      spacing: { ...base.spacing, ...override.spacing },
      radius: { ...base.radius, ...override.radius },
      shadows: { ...base.shadows, ...override.shadows },
      borders: { ...base.borders, ...override.borders },
      motion: { ...base.motion, ...override.motion },
    };
  }
}

export const themeRegistry = new ThemeRegistry();
