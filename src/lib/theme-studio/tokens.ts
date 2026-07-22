/** Strongly typed design token categories */
export interface ColorTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

export interface TypographyTokens {
  fontHeading: string;
  fontBody: string;
  fontSizeBase: string;
  fontSizeH1: string;
  fontSizeH2: string;
  fontSizeH3: string;
  lineHeight: string;
  letterSpacing: string;
}

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface RadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface BorderTokens {
  width: string;
  style: string;
}

export interface MotionTokens {
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
  easing: string;
}

export interface DesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
  borders: BorderTokens;
  motion: MotionTokens;
}

/** Default design tokens — used as fallback when no theme is active. */
export const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    primary: "#6366f1", secondary: "#a78bfa", accent: "#f472b6",
    background: "#ffffff", surface: "#f8fafc", text: "#0f172a",
    textSecondary: "#64748b", border: "#e2e8f0",
    error: "#ef4444", success: "#22c55e", warning: "#f59e0b",
  },
  typography: {
    fontHeading: "Inter, system-ui, sans-serif",
    fontBody: "Inter, system-ui, sans-serif",
    fontSizeBase: "16px", fontSizeH1: "48px", fontSizeH2: "32px", fontSizeH3: "24px",
    lineHeight: "1.5", letterSpacing: "0",
  },
  spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px", xxl: "48px" },
  radius: { none: "0", sm: "4px", md: "8px", lg: "16px", full: "9999px" },
  shadows: { sm: "0 1px 2px rgba(0,0,0,0.05)", md: "0 4px 6px rgba(0,0,0,0.07)", lg: "0 10px 15px rgba(0,0,0,0.1)", xl: "0 20px 25px rgba(0,0,0,0.15)" },
  borders: { width: "1px", style: "solid" },
  motion: { durationFast: "150ms", durationNormal: "300ms", durationSlow: "500ms", easing: "ease-in-out" },
};

/** Light variant overrides */
export const DARK_TOKENS: Partial<DesignTokens> = {
  colors: {
    primary: "#818cf8", secondary: "#c4b5fd", accent: "#f9a8d4",
    background: "#0f172a", surface: "#1e293b", text: "#f1f5f9",
    textSecondary: "#94a3b8", border: "#334155",
    error: "#fca5a5", success: "#86efac", warning: "#fde68a",
  },
};
