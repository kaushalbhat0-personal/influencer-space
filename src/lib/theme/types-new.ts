export type ThemeCategory =
  | "minimal" | "creator" | "business" | "portfolio" | "photography"
  | "education" | "gaming" | "podcast" | "luxury" | "ecommerce" | "agency";

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
  variants: ThemeVariant[];
}
