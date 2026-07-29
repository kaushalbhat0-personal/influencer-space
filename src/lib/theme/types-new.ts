export type ThemeCategory =
  | "minimal" | "creator" | "business & agency" | "portfolio & creative" | "photography"
  | "coach & education" | "gaming" | "podcast" | "luxury & lifestyle" | "ecommerce" | "agency"
  | "food & restaurant" | "music" | "health";

/** Display labels for each category */
export const CATEGORY_LABELS: Record<ThemeCategory, string> = {
  "minimal": "Minimal",
  "creator": "Creator",
  "business & agency": "Business & Agency",
  "portfolio & creative": "Portfolio & Creative",
  "photography": "Photography",
  "coach & education": "Coach & Education",
  "gaming": "Gaming",
  "podcast": "Podcast",
  "luxury & lifestyle": "Luxury & Lifestyle",
  "ecommerce": "E-Commerce",
  "agency": "Agency",
  "food & restaurant": "Food & Restaurant",
  "music": "Music",
  "health": "Health",
};

export type ThemeStatus = "active" | "deprecated" | "coming_soon";

export interface ThemeVariant {
  mode: "light" | "dark";
  tokens: ThemeDesignTokens;
}

export interface ThemeAuthor {
  name: string;
  url?: string;
}

export interface ThemeDesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  motion: MotionTokens;
  radius: RadiusTokens;
  elevation: ElevationTokens;
  borders: BorderTokens;
}

export interface ColorTokens {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  focus: string;
  overlay: string;
}

export interface TypographyTokens {
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  displayFont?: string;
  headingWeights: Record<string, number>;
  bodyWeight: number;
  baseSize: string;
  scaleRatio: number;
}

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
  "4xl": string;
}

export interface MotionTokens {
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
  easingDefault: string;
  easingEntrance: string;
  easingExit: string;
  hoverScale: string;
  reducedMotion: boolean;
}

export interface RadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ElevationTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface BorderTokens {
  width: string;
  style: string;
  radius: string;
}

export interface ThemeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  author: ThemeAuthor;
  version: string;
  tokenVersion: number;
  category: ThemeCategory;
  tags: string[];
  premium: boolean;
  status: ThemeStatus;
  supportsDarkMode: boolean;
  supportsRTL: boolean;
  previewImage?: string;
  thumbnail?: string;

  /** Cover/hero image for the theme detail page */
  coverImage?: string;

  /** Up to 6 key color swatches for visual preview */
  colorSwatches?: string[];

  /** Feature this theme on the marketplace home */
  featured?: boolean;

  /** Industry IDs this theme is designed for */
  industries?: string[];

  /** Blueprint IDs this theme is known to work well with */
  supportedBlueprints?: string[];

  /** Blueprint IDs this theme is incompatible with */
  incompatibleBlueprints?: string[];

  /** Minimum platform version required */
  minimumPlatformVersion?: string;

  /** Maximum platform version allowed */
  maximumPlatformVersion?: string;

  /** Capabilities required to use this theme (e.g. "premium_themes") */
  requiredCapabilities?: string[];

  /** ISO date of initial release */
  releaseDate?: string;

  /** ISO date of last update */
  updatedAt?: string;

  /** URL to changelog */
  changelog?: string;

  /** URL to documentation */
  documentation?: string;

  /** Aggregate marketplace rating (0-5) */
  rating?: number;

  /** URL to support / contact */
  support?: string;

  variants: ThemeVariant[];
}

export interface ThemeRegistryListOptions {
  category?: string;
  premium?: boolean;
  search?: string;
  entitlements?: string[];
  industries?: string[];
  featured?: boolean;
  sort?: "name" | "newest" | "updated" | "rating";
  limit?: number;
  offset?: number;
}
