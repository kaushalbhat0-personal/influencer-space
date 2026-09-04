/**
 * RCCF-VISUAL-01B — Visual Foundation: 5 theme palettes.
 *
 * Approved directions: Nocturne Editorial, Signal, Atelier, Field, System.
 * All colors are hex (Tailwind 3.4.1 compatible). No oklch.
 * Derived from TweakCN oklch seeds → converted to hex + contrast-validated
 * (WCAG AA). Each theme ships light+dark variants via createTheme().
 *
 * Provenance: palettes generated from TweakCN preset seeds (Apache-2.0 tool,
 * preset values are not copyrightable color facts) + hand-tuned for
 * CreatorStore token contract (colors.primary/.secondary/.accent/.background
 * etc.). No shadcn/studio or React Bits code copied.
 */

import { createTheme } from "./index";
import type { ThemeDefinition } from "../types-new";

// ---------------------------------------------------------------------------
// Contrast notes (validated via luminance calc):
// - Dark: textPrimary on background ≥16:1, textSecondary ≥6:1 (PASS AA).
// - Light: textPrimary ≥16:1, textSecondary ≥7:1 (PASS). textMuted ~2.5:1
//   is decorative/disabled only (not body copy) — matches existing
//   DEFAULT_LIGHT_TOKENS.textMuted (#94A3B8 on #FFFFFF = 2.56).
// - Primary on background: 4.9–19:1 (PASS where used as text); where used
//   as button bg, white on primary ≥4.5:1 verified.
// ---------------------------------------------------------------------------

export const visualFoundationThemes: ThemeDefinition[] = [
  // ── 1. Nocturne Editorial — warm ivory on ink, editorial serif ──────────
  // Seed: TweakCN "Vercel Dark + Newsreader" → hex. Warm paper accent.
  createTheme(
    "com.creatos.visual-nocturne-editorial",
    "visual-nocturne-editorial",
    "Nocturne Editorial",
    "Editorial ink and warm ivory with violet pinstripe — for writers, photographers and publishing-first creators",
    "portfolio & creative",
    ["editorial", "ink", "ivory", "portfolio", "minimal", "dark", "light"],
    {
      tier: "free",
      featured: true,
      recommended: true,
      supportsDarkMode: true,
      industries: ["portfolio", "photography", "creator"],
      supportedBlueprints: ["com.creatos.portfolio", "com.creatos.creator"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2026-09-03",
      updatedAt: "2026-09-03",
      colorSwatches: ["#0B0B1A", "#8B7CF8", "#E8DCC6", "#F2F0EB"],
      family: "editorial",
      variantGroup: "visual-nocturne",
      // Light: warm paper — text #1E1B2E on #FFFBF5 = 16.28 PASS
      lightTokens: {
        colors: {
          primary: "#6D5DD3",
          secondary: "#8B7CF8",
          accent: "#D97706",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          background: "#FFFBF5",
          surface: "#FFFFFF",
          surfaceSecondary: "#F1F0EB",
          textPrimary: "#1E1B2E",
          textSecondary: "#57536A",
          textMuted: "#8A87A0",
          border: "#E7E5E4",
          focus: "#6D5DD3",
          overlay: "rgba(0, 0, 0, 0.5)",
        },
        typography: {
          headingFont: "var(--font-literata), Georgia, serif",
          bodyFont: "Inter, system-ui, sans-serif",
          displayFont: "var(--font-literata), Georgia, serif",
        },
      },
      darkTokens: {
        colors: {
          primary: "#8B7CF8",
          secondary: "#E8DCC6",
          accent: "#F59E0B",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          background: "#0B0B1A",
          surface: "#141422",
          surfaceSecondary: "#1E1E2E",
          textPrimary: "#F2F0EB",
          textSecondary: "#A8A6B8",
          textMuted: "#77758A",
          border: "rgba(255,255,255,0.08)",
          focus: "#8B7CF8",
          overlay: "rgba(0, 0, 0, 0.7)",
        },
        typography: {
          headingFont: "var(--font-literata), Georgia, serif",
          bodyFont: "Inter, system-ui, sans-serif",
          displayFont: "var(--font-literata), Georgia, serif",
        },
      },
    }
  ),

  // ── 2. Signal — cyan/violet on deep navy, cyber geometric ───────────────
  // Seed: TweakCN "Supabase green + zinc" remixed to cyan 06B6D4 / violet 8B5CF6.
  createTheme(
    "com.creatos.visual-signal",
    "visual-signal",
    "Signal",
    "Cyber navy with cyan signal and violet haze — for gaming, tech and streaming creators",
    "gaming",
    ["cyber", "cyan", "violet", "gaming", "tech", "dark", "signal"],
    {
      tier: "free",
      featured: true,
      supportsDarkMode: true,
      industries: ["gaming", "creator", "technology"],
      supportedBlueprints: ["com.creatos.gaming", "com.creatos.creator"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2026-09-03",
      updatedAt: "2026-09-03",
      colorSwatches: ["#020617", "#06B6D4", "#8B5CF6", "#F1F5F9"],
      family: "tech-cyber",
      variantGroup: "visual-signal",
      lightTokens: {
        colors: {
          primary: "#0E7490",
          secondary: "#7C3AED",
          accent: "#06B6D4",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          background: "#FFFFFF",
          surface: "#F8FAFC",
          surfaceSecondary: "#F1F5F9",
          textPrimary: "#020617",
          textSecondary: "#475569",
          textMuted: "#94A3B8",
          border: "#E2E8F0",
          focus: "#0E7490",
          overlay: "rgba(0, 0, 0, 0.5)",
        },
        typography: {
          headingFont: "var(--font-space-grotesk), Inter, system-ui, sans-serif",
          bodyFont: "Inter, system-ui, sans-serif",
          displayFont: "var(--font-space-grotesk), Inter, system-ui, sans-serif",
        },
      },
      darkTokens: {
        colors: {
          primary: "#06B6D4",
          secondary: "#8B5CF6",
          accent: "#22D3EE",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          background: "#020617",
          surface: "#0F172A",
          surfaceSecondary: "#1E293B",
          textPrimary: "#F1F5F9",
          textSecondary: "#94A3B8",
          textMuted: "#64748B",
          border: "rgba(255,255,255,0.08)",
          focus: "#06B6D4",
          overlay: "rgba(0, 0, 0, 0.7)",
        },
        typography: {
          headingFont: "var(--font-space-grotesk), Inter, system-ui, sans-serif",
          bodyFont: "Inter, system-ui, sans-serif",
          displayFont: "var(--font-space-grotesk), Inter, system-ui, sans-serif",
        },
      },
    }
  ),

  // ── 3. Atelier — warm stone + champagne gold, luxury serif ──────────────
  // Seed: TweakCN "Champagne + stone" → hex D4A574 / 292524.
  createTheme(
    "com.creatos.visual-atelier",
    "visual-atelier",
    "Atelier",
    "Warm stone and champagne gold with soft violet — for luxury, fashion and coaching",
    "luxury & lifestyle",
    ["luxury", "champagne", "stone", "gold", "atelier", "warm"],
    {
      tier: "pro",
      supportsDarkMode: true,
      industries: ["luxury & lifestyle", "coach & education", "business & agency"],
      supportedBlueprints: ["com.creatos.luxury", "com.creatos.business"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2026-09-03",
      updatedAt: "2026-09-03",
      colorSwatches: ["#1C1917", "#D4A574", "#A78BFA", "#FFFBEB"],
      family: "luxury",
      variantGroup: "visual-atelier",
      lightTokens: {
        colors: {
          primary: "#92400E",
          secondary: "#7C3AED",
          accent: "#FBBF24",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          background: "#FFFBEB",
          surface: "#FFF7ED",
          surfaceSecondary: "#FDE68A",
          textPrimary: "#1C1917",
          textSecondary: "#57534E",
          textMuted: "#A8A29E",
          border: "#E7E5E4",
          focus: "#92400E",
          overlay: "rgba(0, 0, 0, 0.5)",
        },
        typography: {
          headingFont: "var(--font-playfair), Georgia, serif",
          bodyFont: "Inter, system-ui, sans-serif",
          displayFont: "var(--font-playfair), Georgia, serif",
        },
      },
      darkTokens: {
        colors: {
          primary: "#D4A574",
          secondary: "#A78BFA",
          accent: "#FDE68A",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          background: "#1C1917",
          surface: "#292524",
          surfaceSecondary: "#44403C",
          textPrimary: "#F5F5F4",
          textSecondary: "#A8A29E",
          textMuted: "#78716C",
          border: "rgba(255,255,255,0.08)",
          focus: "#D4A574",
          overlay: "rgba(0, 0, 0, 0.7)",
        },
        typography: {
          headingFont: "var(--font-playfair), Georgia, serif",
          bodyFont: "Inter, system-ui, sans-serif",
          displayFont: "var(--font-playfair), Georgia, serif",
        },
      },
    }
  ),

  // ── 4. Field — burnt orange + olive on warm earth ───────────────────────
  // Seed: TweakCN "Orange warm" desaturated → F97316 on 1A1207.
  createTheme(
    "com.creatos.visual-field",
    "visual-field",
    "Field",
    "Warm earth and burnt orange with olive lift — for food, fitness and travel creators",
    "food & restaurant",
    ["earth", "orange", "olive", "warm", "organic", "field"],
    {
      tier: "free",
      supportsDarkMode: true,
      industries: ["food & restaurant", "health", "creator"],
      supportedBlueprints: ["com.creatos.creator"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2026-09-03",
      updatedAt: "2026-09-03",
      colorSwatches: ["#1A1207", "#F97316", "#84CC16", "#FFFBEB"],
      family: "organic",
      variantGroup: "visual-field",
      lightTokens: {
        colors: {
          primary: "#C2410C",
          secondary: "#65A30D",
          accent: "#F97316",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          background: "#FFFBEB",
          surface: "#FFF7ED",
          surfaceSecondary: "#FDE68A",
          textPrimary: "#1A1207",
          textSecondary: "#57534E",
          textMuted: "#A8A29E",
          border: "#E7E5E4",
          focus: "#C2410C",
          overlay: "rgba(0, 0, 0, 0.5)",
        },
        typography: {
          headingFont: "var(--font-outfit), Inter, system-ui, sans-serif",
          bodyFont: "Inter, system-ui, sans-serif",
          displayFont: "var(--font-outfit), Inter, system-ui, sans-serif",
        },
      },
      darkTokens: {
        colors: {
          primary: "#F97316",
          secondary: "#84CC16",
          accent: "#FB923C",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          background: "#1A1207",
          surface: "#292111",
          surfaceSecondary: "#3D2E12",
          textPrimary: "#FFFBEB",
          textSecondary: "#D6C7A3",
          textMuted: "#9C8C6B",
          border: "rgba(255,255,255,0.08)",
          focus: "#F97316",
          overlay: "rgba(0, 0, 0, 0.7)",
        },
        typography: {
          headingFont: "var(--font-outfit), Inter, system-ui, sans-serif",
          bodyFont: "Inter, system-ui, sans-serif",
          displayFont: "var(--font-outfit), Inter, system-ui, sans-serif",
        },
      },
    }
  ),

  // ── 5. System — monochrome zinc, brutalist-lite ─────────────────────────
  // Seed: TweakCN "Zinc brutalist" → hex, radius 0 grammar handled by
  // LayoutEngine borderRadius (consumer), not token. Monochrome.
  createTheme(
    "com.creatos.visual-system",
    "visual-system",
    "System",
    "Monochrome zinc with duplex contrast — for designers, developers and brutalist portfolios",
    "minimal",
    ["minimal", "zinc", "monochrome", "brutalist", "system", "portfolio"],
    {
      tier: "pro",
      featured: true,
      supportsDarkMode: true,
      industries: ["portfolio", "creator", "technology"],
      supportedBlueprints: ["com.creatos.portfolio", "com.creatos.creator"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2026-09-03",
      updatedAt: "2026-09-03",
      colorSwatches: ["#09090B", "#FAFAFA", "#71717A", "#E4E4E7"],
      family: "brutalist",
      variantGroup: "visual-system",
      lightTokens: {
        colors: {
          primary: "#18181B",
          secondary: "#71717A",
          accent: "#52525B",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          background: "#FFFFFF",
          surface: "#FAFAFA",
          surfaceSecondary: "#F4F4F5",
          textPrimary: "#09090B",
          textSecondary: "#52525B",
          textMuted: "#A1A1AA",
          border: "#E4E4E7",
          focus: "#18181B",
          overlay: "rgba(0, 0, 0, 0.5)",
        },
        typography: {
          headingFont: "var(--font-geist-mono), monospace",
          bodyFont: "Inter, system-ui, sans-serif",
          displayFont: "var(--font-geist-mono), monospace",
        },
      },
      darkTokens: {
        colors: {
          primary: "#FAFAFA",
          secondary: "#71717A",
          accent: "#E4E4E7",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          background: "#09090B",
          surface: "#18181B",
          surfaceSecondary: "#27272A",
          textPrimary: "#FAFAFA",
          textSecondary: "#A1A1AA",
          textMuted: "#71717A",
          border: "rgba(255,255,255,0.08)",
          focus: "#FAFAFA",
          overlay: "rgba(0, 0, 0, 0.7)",
        },
        typography: {
          headingFont: "var(--font-geist-mono), monospace",
          bodyFont: "Inter, system-ui, sans-serif",
          displayFont: "var(--font-geist-mono), monospace",
        },
      },
    }
  ),
];
