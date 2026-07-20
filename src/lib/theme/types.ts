export type ThemeId = string;

export const THEME_ID_REVERSE_DNS_PATTERN =
  /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*\.[a-z][a-z0-9-]+$/;

export function isValidThemeId(id: string): id is ThemeId {
  return id.length >= 5 && id.length <= 128 && THEME_ID_REVERSE_DNS_PATTERN.test(id);
}

export function validateThemeId(id: string): { valid: boolean; message?: string } {
  if (id.length < 5) return { valid: false, message: "Theme ID must be at least 5 characters" };
  if (id.length > 128) return { valid: false, message: "Theme ID must be at most 128 characters" };
  if (!THEME_ID_REVERSE_DNS_PATTERN.test(id)) {
    return { valid: false, message: "Theme ID must be reverse-DNS format (e.g., com.creatos.neon-dark)" };
  }
  return { valid: true };
}

export type SemVer = `${number}.${number}.${number}`;

export type SurfaceId =
  | "website"
  | "website_preview"
  | "mobile_app"
  | "embed_widget"
  | "api_rest"
  | "pdf_export"
  | "email_template"
  | "admin_panel"
  | "agency_preview"
  | "ai_context"
  | "cron_job";

export type TokenPath = string;

export type HexColor = `#${string}`;

export type CssLength = `${number}${"px" | "rem" | "em" | "%" | "vh" | "vw"}`;

export type CssDuration = `${number}${"ms" | "s"}`;

export type TokenValue = string | ResponsiveTokenValue;

export interface ResponsiveTokenValue {
  default: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  "2xl"?: string;
  dark?: string;
}

export interface DesignTokenMap {
  [tokenPath: TokenPath]: TokenValue;
}

export interface NestedTokenMap {
  [key: string]: NestedTokenMap | string;
}

export type TokenValueByPath<
  T extends DesignTokenMap,
  P extends TokenPath
> = P extends keyof T ? T[P] : never;

export interface ThemeManifest {
  id: ThemeId;
  name: string;
  version: SemVer;
  description: string;
  author: {
    name: string;
    type: "platform" | "agency" | "marketplace";
    id: string;
    url?: string;
  };
  license: string;
  previewImages: string[];
  tags: string[];
  minPlatformVersion: SemVer;
  supportedSurfaces: SurfaceId[];
  supportedModules: string[];
  pricing: {
    free: boolean;
    price?: number;
    currency?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ThemeIdentity {
  id: ThemeId;
  name: string;
  version: SemVer;
  author: {
    type: "platform" | "agency" | "marketplace";
    id: string;
  };
}

export interface ThemeInheritance {
  extends: ThemeId | null;
  overridableTokens: TokenPath[];
  lockedTokens: TokenPath[];
}

export interface FontFamilyDefinition {
  family: string;
  fallbacks: string[];
  importUrl: string | null;
}

export interface AnimationPreset {
  name: string;
  keyframes: Record<string, Record<string, string>>;
  config: Record<string, string>;
}

export interface TransitionConfig {
  property: string;
  duration: CssDuration;
  easing: string;
}

export interface ComponentVariant {
  moduleId: string;
  slot: string;
  componentPath: string;
}

export interface LayoutPreset {
  name: string;
  moduleOrder: string[];
  moduleVisibility: Record<string, boolean>;
}

export interface ThemeMarketplace {
  previewImages: string[];
  tags: string[];
  pricing: {
    free: boolean;
    price?: number;
    currency?: string;
  };
  compatibleModules: string[];
  minPlatformVersion: SemVer;
}

export interface Theme {
  identity: ThemeIdentity;
  inheritance: ThemeInheritance;
  tokens: DesignTokenMap;
  variants: Record<string, Record<string, string>>;
  layouts: LayoutPreset[];
  fonts: FontFamilyDefinition[];
  animations: AnimationPreset[];
  surfaceOverrides: Partial<Record<SurfaceId, DesignTokenMap>>;
  marketplace: ThemeMarketplace;
}

export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  borderRadius: string;
  layoutDensity: "compact" | "comfortable" | "spacious";
  font: string;
}

export interface ResolvedTheme {
  identity: ThemeIdentity;
  tokens: DesignTokenMap;
  nestedTokens: NestedTokenMap;
  cssVariables: string;
  tailwindConfig: Record<string, unknown>;
  fonts: FontFamilyDefinition[];
  animations: AnimationPreset[];
  layouts: LayoutPreset[];
  surface: SurfaceId;
}

export type ThemeLayer =
  | "platform"
  | "theme"
  | "agency"
  | "creator"
  | "module"
  | "runtime";

export interface ThemeLayerConfig {
  layer: ThemeLayer;
  tokens: Partial<DesignTokenMap>;
  lockedTokens: TokenPath[];
}

export interface ThemeOverride {
  layer: ThemeLayer;
  tokens: Partial<DesignTokenMap>;
}

export interface ThemeValidationError {
  path: TokenPath;
  message: string;
  layer?: ThemeLayer;
}

export interface ThemeValidationResult {
  valid: boolean;
  errors: ThemeValidationError[];
  warnings: ThemeValidationError[];
}

export type ContrastLevel = "AA" | "AAA";

export interface ContrastCheckResult {
  tokenPath: string;
  foregroundColor: string;
  backgroundColor: string;
  contrastRatio: number;
  passes: { AA: boolean; AAA: boolean };
}

export interface AccessibilityValidationResult {
  valid: boolean;
  contrast: ContrastCheckResult[];
  errors: ThemeValidationError[];
  warnings: ThemeValidationError[];
}

export interface ResolveOptions {
  baseTheme: Theme;
  overrides: ThemeOverride[];
  surface?: SurfaceId;
  runtime?: {
    device?: "mobile" | "tablet" | "desktop";
    darkMode?: boolean;
    reducedMotion?: boolean;
    highContrast?: boolean;
    locale?: string;
  };
}

export type ThemeOverrides = Partial<{
  primary: string;
  secondary: string;
  accent: string;
  font: string;
  borderRadius: string;
  layoutDensity: "compact" | "comfortable" | "spacious";
}>;
