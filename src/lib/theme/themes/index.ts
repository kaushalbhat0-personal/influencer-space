import type {
  ThemeDefinition, ThemeDesignTokens, ThemeCategory,
  ColorTokens, TypographyTokens, SpacingTokens, MotionTokens,
  RadiusTokens, ElevationTokens, BorderTokens,
} from "../types-new";
import { DEFAULT_LIGHT_TOKENS, DEFAULT_DARK_TOKENS, mergeTokens, freezeTokens } from "../tokens-new";
import { creatorThemes } from "./creator";
import { businessThemes } from "./business";
import { portfolioThemes } from "./portfolio";
import { gamingThemes } from "./gaming";
import { luxuryThemes } from "./luxury";
import { restaurantThemes } from "./restaurant";
import { educationThemes } from "./education";
import { podcastThemes } from "./podcast";
import { catalogThemes } from "./catalog";

interface PartialTokens {
  colors?: Partial<ColorTokens>;
  typography?: Partial<TypographyTokens>;
  spacing?: Partial<SpacingTokens>;
  motion?: Partial<MotionTokens>;
  radius?: Partial<RadiusTokens>;
  elevation?: Partial<ElevationTokens>;
  borders?: Partial<BorderTokens>;
}

export function createTheme(
  id: string,
  slug: string,
  name: string,
  description: string,
  category: ThemeCategory,
  tags: string[],
  opts?: {
    premium?: boolean;
    tier?: "free" | "starter" | "pro" | "business" | "enterprise";
    recommended?: boolean;
    featured?: boolean;
    supportsDarkMode?: boolean;
    supportsRTL?: boolean;
    industries?: string[];
    supportedBlueprints?: string[];
    incompatibleBlueprints?: string[];
    minimumPlatformVersion?: string;
    requiredCapabilities?: string[];
    releaseDate?: string;
    updatedAt?: string;
    changelog?: string;
    documentation?: string;
    support?: string;
    coverImage?: string;
    colorSwatches?: string[];
    lightTokens?: PartialTokens;
    darkTokens?: PartialTokens;
  },
): ThemeDefinition {
  const tier = opts?.tier;
  const variants: ThemeDefinition["variants"] = [];
  const hasDark = opts?.supportsDarkMode !== false;
  const hasLight = opts?.darkTokens !== undefined || opts?.supportsDarkMode === true;

  if (hasLight && opts?.lightTokens) {
    variants.push({
      mode: "light",
      tokens: freezeTokens(mergeTokens(DEFAULT_LIGHT_TOKENS, opts.lightTokens as Partial<ThemeDesignTokens>)),
    });
  }

  if (hasDark) {
    const darkOverrides = opts?.darkTokens ?? opts?.lightTokens ?? {};
    variants.push({
      mode: "dark",
      tokens: freezeTokens(mergeTokens(DEFAULT_DARK_TOKENS, darkOverrides as Partial<ThemeDesignTokens>)),
    });
  }

  if (variants.length === 0) {
    variants.push({
      mode: "dark",
      tokens: freezeTokens({ ...DEFAULT_DARK_TOKENS }),
    });
  }

  return {
    id,
    slug,
    name,
    description,
    author: { name: "CreatorOS" },
    version: "1.0.0",
    tokenVersion: 1,
    category,
    tags,
    premium: opts?.premium ?? (tier ? tier !== "free" : false),
    tier,
    recommended: opts?.recommended,
    status: "active",
    supportsDarkMode: opts?.supportsDarkMode ?? false,
    supportsRTL: opts?.supportsRTL ?? false,
    industries: opts?.industries,
    supportedBlueprints: opts?.supportedBlueprints,
    incompatibleBlueprints: opts?.incompatibleBlueprints,
    minimumPlatformVersion: opts?.minimumPlatformVersion,
    requiredCapabilities: opts?.requiredCapabilities,
    featured: opts?.featured,
    coverImage: opts?.coverImage,
    colorSwatches: opts?.colorSwatches ?? extractSwatches(variants[0]?.tokens.colors),
    releaseDate: opts?.releaseDate,
    updatedAt: opts?.updatedAt,
    changelog: opts?.changelog,
    documentation: opts?.documentation,
    support: opts?.support,
    previewImage: `/themes/${slug}/preview.png`,
    variants,
  };
}

function extractSwatches(colors: ThemeDefinition["variants"][0]["tokens"]["colors"]): string[] {
  const order = ["primary", "secondary", "accent", "background", "surface", "textPrimary"] as const;
  return order.map((k) => colors[k]).filter((c) => c.startsWith("#"));
}

export const ALL_THEMES: ThemeDefinition[] = [
  ...creatorThemes,
  ...businessThemes,
  ...portfolioThemes,
  ...gamingThemes,
  ...luxuryThemes,
  ...restaurantThemes,
  ...educationThemes,
  ...podcastThemes,
  ...catalogThemes,
];
