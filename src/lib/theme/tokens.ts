import type { HexColor, CssLength, CssDuration, DesignTokenMap } from "./types";

export const TOKEN_PATHS = {
  color: {
    surface: {
      primary: "color.surface.primary",
      secondary: "color.surface.secondary",
      elevated: "color.surface.elevated",
    },
    text: {
      primary: "color.text.primary",
      secondary: "color.text.secondary",
      muted: "color.text.muted",
    },
    border: {
      default: "color.border.default",
      hover: "color.border.hover",
    },
    accent: {
      primary: "color.accent.primary",
      hover: "color.accent.hover",
      muted: "color.accent.muted",
    },
    status: {
      success: "color.status.success",
      warning: "color.status.warning",
      error: "color.status.error",
      info: "color.status.info",
    },
  },
  typography: {
    family: {
      base: "typography.family.base",
      heading: "typography.family.heading",
      mono: "typography.family.mono",
    },
    scale: {
      xs: "typography.scale.xs",
      sm: "typography.scale.sm",
      base: "typography.scale.base",
      lg: "typography.scale.lg",
      xl: "typography.scale.xl",
      "2xl": "typography.scale.2xl",
      "3xl": "typography.scale.3xl",
      "4xl": "typography.scale.4xl",
    },
    weight: {
      normal: "typography.weight.normal",
      medium: "typography.weight.medium",
      semibold: "typography.weight.semibold",
      bold: "typography.weight.bold",
    },
    lineHeight: {
      tight: "typography.lineHeight.tight",
      normal: "typography.lineHeight.normal",
      relaxed: "typography.lineHeight.relaxed",
    },
  },
  spacing: {
    "1": "spacing.1",
    "2": "spacing.2",
    "3": "spacing.3",
    "4": "spacing.4",
    "5": "spacing.5",
    "6": "spacing.6",
    "8": "spacing.8",
    "10": "spacing.10",
    "12": "spacing.12",
    "16": "spacing.16",
    sectionGap: "spacing.sectionGap",
    containerMaxWidth: "spacing.containerMaxWidth",
  },
  radius: {
    none: "radius.none",
    sm: "radius.sm",
    md: "radius.md",
    lg: "radius.lg",
    xl: "radius.xl",
    full: "radius.full",
  },
  elevation: {
    none: "elevation.none",
    sm: "elevation.sm",
    md: "elevation.md",
    lg: "elevation.lg",
    xl: "elevation.xl",
  },
  border: {
    width: {
      thin: "border.width.thin",
      default: "border.width.default",
      thick: "border.width.thick",
    },
    opacity: {
      default: "border.opacity.default",
      hover: "border.opacity.hover",
    },
  },
  component: {
    button: {
      height: {
        sm: "component.button.height.sm",
        md: "component.button.height.md",
        lg: "component.button.height.lg",
      },
      paddingX: "component.button.paddingX",
      fontSize: "component.button.fontSize",
    },
    card: {
      padding: "component.card.padding",
      gap: "component.card.gap",
    },
    input: {
      height: "component.input.height",
      paddingX: "component.input.paddingX",
    },
    nav: {
      height: "component.nav.height",
      itemGap: "component.nav.itemGap",
    },
  },
  animation: {
    duration: {
      instant: "animation.duration.instant",
      fast: "animation.duration.fast",
      normal: "animation.duration.normal",
      slow: "animation.duration.slow",
    },
    easing: {
      default: "animation.easing.default",
      in: "animation.easing.in",
      out: "animation.easing.out",
      inOut: "animation.easing.inOut",
    },
  },
  breakpoint: {
    sm: "breakpoint.sm",
    md: "breakpoint.md",
    lg: "breakpoint.lg",
    xl: "breakpoint.xl",
    "2xl": "breakpoint.2xl",
  },
} as const;

Object.freeze(TOKEN_PATHS);
Object.freeze(TOKEN_PATHS.color);
Object.freeze(TOKEN_PATHS.color.surface);
Object.freeze(TOKEN_PATHS.color.text);
Object.freeze(TOKEN_PATHS.color.border);
Object.freeze(TOKEN_PATHS.color.accent);
Object.freeze(TOKEN_PATHS.color.status);
Object.freeze(TOKEN_PATHS.typography);
Object.freeze(TOKEN_PATHS.typography.family);
Object.freeze(TOKEN_PATHS.typography.scale);
Object.freeze(TOKEN_PATHS.typography.weight);
Object.freeze(TOKEN_PATHS.typography.lineHeight);
Object.freeze(TOKEN_PATHS.spacing);
Object.freeze(TOKEN_PATHS.radius);
Object.freeze(TOKEN_PATHS.elevation);
Object.freeze(TOKEN_PATHS.border);
Object.freeze(TOKEN_PATHS.border.width);
Object.freeze(TOKEN_PATHS.border.opacity);
Object.freeze(TOKEN_PATHS.component);
Object.freeze(TOKEN_PATHS.component.button);
Object.freeze(TOKEN_PATHS.component.button.height);
Object.freeze(TOKEN_PATHS.component.card);
Object.freeze(TOKEN_PATHS.component.input);
Object.freeze(TOKEN_PATHS.component.nav);
Object.freeze(TOKEN_PATHS.animation);
Object.freeze(TOKEN_PATHS.animation.duration);
Object.freeze(TOKEN_PATHS.animation.easing);
Object.freeze(TOKEN_PATHS.breakpoint);

export const REQUIRED_TOKEN_PATHS = [
  TOKEN_PATHS.color.surface.primary,
  TOKEN_PATHS.color.surface.secondary,
  TOKEN_PATHS.color.surface.elevated,
  TOKEN_PATHS.color.text.primary,
  TOKEN_PATHS.color.text.secondary,
  TOKEN_PATHS.color.text.muted,
  TOKEN_PATHS.color.border.default,
  TOKEN_PATHS.color.border.hover,
  TOKEN_PATHS.color.accent.primary,
  TOKEN_PATHS.color.accent.hover,
  TOKEN_PATHS.color.accent.muted,
  TOKEN_PATHS.color.status.success,
  TOKEN_PATHS.color.status.warning,
  TOKEN_PATHS.color.status.error,
  TOKEN_PATHS.color.status.info,
  TOKEN_PATHS.typography.family.base,
  TOKEN_PATHS.typography.family.heading,
  TOKEN_PATHS.typography.family.mono,
  TOKEN_PATHS.typography.scale.xs,
  TOKEN_PATHS.typography.scale.sm,
  TOKEN_PATHS.typography.scale.base,
  TOKEN_PATHS.typography.scale.lg,
  TOKEN_PATHS.typography.scale.xl,
  TOKEN_PATHS.typography.weight.normal,
  TOKEN_PATHS.typography.weight.semibold,
  TOKEN_PATHS.typography.weight.bold,
  TOKEN_PATHS.radius.md,
  TOKEN_PATHS.animation.duration.normal,
  TOKEN_PATHS.animation.easing.default,
] as const;

Object.freeze(REQUIRED_TOKEN_PATHS);

export const DEFAULT_NEON_DARK_TOKENS: DesignTokenMap = {
  [TOKEN_PATHS.color.surface.primary]: "#09090b" as HexColor,
  [TOKEN_PATHS.color.surface.secondary]: "#18181b" as HexColor,
  [TOKEN_PATHS.color.surface.elevated]: "#27272a" as HexColor,
  [TOKEN_PATHS.color.text.primary]: "#ffffff",
  [TOKEN_PATHS.color.text.secondary]: "#a1a1aa",
  [TOKEN_PATHS.color.text.muted]: "#71717a",
  [TOKEN_PATHS.color.border.default]: "rgba(255,255,255,0.08)",
  [TOKEN_PATHS.color.border.hover]: "rgba(255,255,255,0.15)",
  [TOKEN_PATHS.color.accent.primary]: "#00f5ff" as HexColor,
  [TOKEN_PATHS.color.accent.hover]: "#00c4cc" as HexColor,
  [TOKEN_PATHS.color.accent.muted]: "rgba(0,245,255,0.15)",
  [TOKEN_PATHS.color.status.success]: "#22c55e" as HexColor,
  [TOKEN_PATHS.color.status.warning]: "#f59e0b" as HexColor,
  [TOKEN_PATHS.color.status.error]: "#ef4444" as HexColor,
  [TOKEN_PATHS.color.status.info]: "#3b82f6" as HexColor,
  [TOKEN_PATHS.typography.family.base]:
    "Inter, system-ui, -apple-system, sans-serif",
  [TOKEN_PATHS.typography.family.heading]:
    "Inter, system-ui, -apple-system, sans-serif",
  [TOKEN_PATHS.typography.family.mono]:
    "'JetBrains Mono', 'Fira Code', monospace",
  [TOKEN_PATHS.typography.scale.xs]: "0.75rem",
  [TOKEN_PATHS.typography.scale.sm]: "0.875rem",
  [TOKEN_PATHS.typography.scale.base]: "1rem",
  [TOKEN_PATHS.typography.scale.lg]: "1.125rem",
  [TOKEN_PATHS.typography.scale.xl]: "1.25rem",
  [TOKEN_PATHS.typography.scale["2xl"]]: "1.5rem",
  [TOKEN_PATHS.typography.scale["3xl"]]: {
    default: "1.875rem",
    md: "2.25rem",
    lg: "3rem",
  },
  [TOKEN_PATHS.typography.scale["4xl"]]: {
    default: "2.25rem",
    md: "3rem",
    lg: "3.75rem",
  },
  [TOKEN_PATHS.typography.weight.normal]: "400",
  [TOKEN_PATHS.typography.weight.medium]: "500",
  [TOKEN_PATHS.typography.weight.semibold]: "600",
  [TOKEN_PATHS.typography.weight.bold]: "700",
  [TOKEN_PATHS.typography.lineHeight.tight]: "1.25",
  [TOKEN_PATHS.typography.lineHeight.normal]: "1.5",
  [TOKEN_PATHS.typography.lineHeight.relaxed]: "1.75",
  [TOKEN_PATHS.spacing["1"]]: "4px" as CssLength,
  [TOKEN_PATHS.spacing["2"]]: "8px" as CssLength,
  [TOKEN_PATHS.spacing["3"]]: "12px" as CssLength,
  [TOKEN_PATHS.spacing["4"]]: "16px" as CssLength,
  [TOKEN_PATHS.spacing["5"]]: "20px" as CssLength,
  [TOKEN_PATHS.spacing["6"]]: "24px" as CssLength,
  [TOKEN_PATHS.spacing["8"]]: "32px" as CssLength,
  [TOKEN_PATHS.spacing["10"]]: "40px" as CssLength,
  [TOKEN_PATHS.spacing["12"]]: "48px" as CssLength,
  [TOKEN_PATHS.spacing["16"]]: "64px" as CssLength,
  [TOKEN_PATHS.spacing.sectionGap]: "80px" as CssLength,
  [TOKEN_PATHS.spacing.containerMaxWidth]: "1200px" as CssLength,
  [TOKEN_PATHS.radius.none]: "0",
  [TOKEN_PATHS.radius.sm]: "4px" as CssLength,
  [TOKEN_PATHS.radius.md]: "8px" as CssLength,
  [TOKEN_PATHS.radius.lg]: "12px" as CssLength,
  [TOKEN_PATHS.radius.xl]: "16px" as CssLength,
  [TOKEN_PATHS.radius.full]: "9999px" as CssLength,
  [TOKEN_PATHS.elevation.none]: "none",
  [TOKEN_PATHS.elevation.sm]: "0 1px 3px rgba(0,0,0,0.3)",
  [TOKEN_PATHS.elevation.md]: "0 4px 12px rgba(0,0,0,0.4)",
  [TOKEN_PATHS.elevation.lg]: "0 8px 30px rgba(0,0,0,0.5)",
  [TOKEN_PATHS.elevation.xl]: "0 16px 48px rgba(0,0,0,0.6)",
  [TOKEN_PATHS.border.width.thin]: "1px" as CssLength,
  [TOKEN_PATHS.border.width.default]: "1.5px" as CssLength,
  [TOKEN_PATHS.border.width.thick]: "2px" as CssLength,
  [TOKEN_PATHS.border.opacity.default]: "0.08",
  [TOKEN_PATHS.border.opacity.hover]: "0.15",
  [TOKEN_PATHS.component.button.height.sm]: "36px" as CssLength,
  [TOKEN_PATHS.component.button.height.md]: "44px" as CssLength,
  [TOKEN_PATHS.component.button.height.lg]: "52px" as CssLength,
  [TOKEN_PATHS.component.button.paddingX]: "16px" as CssLength,
  [TOKEN_PATHS.component.button.fontSize]: "14px" as CssLength,
  [TOKEN_PATHS.component.card.padding]: "24px" as CssLength,
  [TOKEN_PATHS.component.card.gap]: "16px" as CssLength,
  [TOKEN_PATHS.component.input.height]: "44px" as CssLength,
  [TOKEN_PATHS.component.input.paddingX]: "12px" as CssLength,
  [TOKEN_PATHS.component.nav.height]: "56px" as CssLength,
  [TOKEN_PATHS.component.nav.itemGap]: "8px" as CssLength,
  [TOKEN_PATHS.animation.duration.instant]: "0ms" as CssDuration,
  [TOKEN_PATHS.animation.duration.fast]: "150ms" as CssDuration,
  [TOKEN_PATHS.animation.duration.normal]: "300ms" as CssDuration,
  [TOKEN_PATHS.animation.duration.slow]: "500ms" as CssDuration,
  [TOKEN_PATHS.animation.easing.default]: "cubic-bezier(0.4,0,0.2,1)",
  [TOKEN_PATHS.animation.easing.in]: "cubic-bezier(0.4,0,1,1)",
  [TOKEN_PATHS.animation.easing.out]: "cubic-bezier(0,0,0.2,1)",
  [TOKEN_PATHS.animation.easing.inOut]: "cubic-bezier(0.4,0,0.2,1)",
  [TOKEN_PATHS.breakpoint.sm]: "640px",
  [TOKEN_PATHS.breakpoint.md]: "768px",
  [TOKEN_PATHS.breakpoint.lg]: "1024px",
  [TOKEN_PATHS.breakpoint.xl]: "1280px",
  [TOKEN_PATHS.breakpoint["2xl"]]: "1536px",
};
