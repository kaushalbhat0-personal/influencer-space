import type { ThemeDefinition } from "../types-new";
import { createTheme } from "./index";

export const luxuryThemes: ThemeDefinition[] = [
  createTheme(
    "com.creatos.royal-plum",
    "royal-plum",
    "Royal Plum",
    "Rich regal purples with gold and rose accents for luxury brands and premium portfolios",
    "luxury & lifestyle",
    ["purple", "gold", "royal", "luxury & lifestyle", "elegant", "premium"],
    {
      premium: true,
      featured: true,
      industries: ["luxury & lifestyle", "portfolio"],
      supportedBlueprints: ["com.creatos.luxury", "com.creatos.portfolio"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-06-20",
      updatedAt: "2025-03-10",
      colorSwatches: ["#4c1d95", "#a855f7", "#f43f5e", "#1a0a2e"],
      family: "luxury",
      variantGroup: "luxury-plum",
      lightTokens: {
        colors: {
          primary: "#4c1d95", secondary: "#a855f7", accent: "#f43f5e",
          background: "#1a0a2e", surface: "#2d1554", surfaceSecondary: "#3d1f64",
          textPrimary: "#faf5ff", textSecondary: "#e9d5ff", textMuted: "#a97aba",
          border: "rgba(255,255,255,0.08)", focus: "#a855f7", overlay: "rgba(0,0,0,0.7)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#4c1d95", secondary: "#a855f7", accent: "#f43f5e",
          background: "#1a0a2e", surface: "#2d1554", surfaceSecondary: "#3d1f64",
          textPrimary: "#faf5ff", textSecondary: "#e9d5ff", textMuted: "#a97aba",
          border: "rgba(255,255,255,0.08)", focus: "#a855f7", overlay: "rgba(0,0,0,0.7)",
        },
        typography: { headingFont: "'Playfair Display', Georgia, serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),

  createTheme(
    "com.creatos.luxury-gold",
    "luxury-gold",
    "Luxury Gold",
    "Opulent black and gold theme for high-end brands, fashion, and premium services",
    "luxury & lifestyle",
    ["gold", "black", "luxury & lifestyle", "opulent", "premium", "elegant"],
    {
      premium: true,
      industries: ["luxury & lifestyle", "business"],
      supportedBlueprints: ["com.creatos.luxury", "com.creatos.business"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.2.0",
      releaseDate: "2024-09-01",
      updatedAt: "2025-02-15",
      colorSwatches: ["#0A0A0A", "#F59E0B", "#FCD34D", "#FFFFFF"],
      family: "luxury",
      variantGroup: "luxury-gold-legacy",
      lightTokens: {
        colors: {
          primary: "#0A0A0A", secondary: "#F59E0B", accent: "#FCD34D",
          background: "#000000", surface: "#0A0A0A", surfaceSecondary: "#1A1A1A",
          textPrimary: "#FFFFFF", textSecondary: "#D4D4D4", textMuted: "#8A8A8A",
          border: "rgba(255,255,255,0.08)", focus: "#F59E0B", overlay: "rgba(0,0,0,0.8)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#0A0A0A", secondary: "#F59E0B", accent: "#FCD34D",
          background: "#000000", surface: "#0A0A0A", surfaceSecondary: "#1A1A1A",
          textPrimary: "#FFFFFF", textSecondary: "#D4D4D4", textMuted: "#8A8A8A",
          border: "rgba(255,255,255,0.08)", focus: "#F59E0B", overlay: "rgba(0,0,0,0.8)",
        },
        typography: { headingFont: "'Playfair Display', Georgia, serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),

  createTheme(
    "com.creatos.luxury-ivory",
    "luxury-ivory",
    "Luxury Ivory",
    "Elegant ivory and champagne theme for luxury brands, weddings, and premium lifestyle",
    "luxury & lifestyle",
    ["ivory", "champagne", "luxury & lifestyle", "elegant", "light", "premium"],
    {
      premium: true,
      industries: ["luxury & lifestyle", "portfolio"],
      supportedBlueprints: ["com.creatos.luxury", "com.creatos.portfolio"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-10-01",
      updatedAt: "2025-01-20",
      colorSwatches: ["#FEF3C7", "#D97706", "#FDE68A", "#FFFFFF"],
      family: "luxury",
      variantGroup: "luxury-ivory",
      lightTokens: {
        colors: {
          primary: "#78350F", secondary: "#D97706", accent: "#FDE68A",
          background: "#FFFBEB", surface: "#FEF3C7", surfaceSecondary: "#FDE68A",
          textPrimary: "#292524", textSecondary: "#78716C", textMuted: "#A8A29E",
          border: "#E7E5E4", focus: "#D97706", overlay: "rgba(0,0,0,0.4)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#FDE68A", secondary: "#F59E0B", accent: "#FEF3C7",
          background: "#1C1917", surface: "#292524", surfaceSecondary: "#44403C",
          textPrimary: "#F5F5F4", textSecondary: "#A8A29E", textMuted: "#78716C",
          border: "rgba(255,255,255,0.06)", focus: "#FDE68A", overlay: "rgba(0,0,0,0.6)",
        },
        typography: { headingFont: "'Playfair Display', Georgia, serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),

  createTheme(
    "com.creatos.fashion",
    "fashion",
    "Fashion",
    "Chic rose and charcoal theme for fashion brands, stylists, and beauty professionals",
    "luxury & lifestyle",
    ["fashion", "rose", "charcoal", "chic", "elegant", "beauty"],
    {
      premium: true,
      industries: ["luxury & lifestyle", "portfolio"],
      supportedBlueprints: ["com.creatos.luxury", "com.creatos.portfolio"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-08-15",
      updatedAt: "2025-03-05",
      colorSwatches: ["#1A1314", "#E11D48", "#FB7185", "#FFFFFF"],
      family: "luxury",
      variantGroup: "luxury-fashion",
      lightTokens: {
        colors: {
          primary: "#1A1314", secondary: "#E11D48", accent: "#FB7185",
          background: "#0D0A0B", surface: "#1A1314", surfaceSecondary: "#2A1F21",
          textPrimary: "#FDF2F4", textSecondary: "#D4A0A8", textMuted: "#8A6A70",
          border: "rgba(255,255,255,0.06)", focus: "#E11D48", overlay: "rgba(0,0,0,0.7)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#1A1314", secondary: "#E11D48", accent: "#FB7185",
          background: "#0D0A0B", surface: "#1A1314", surfaceSecondary: "#2A1F21",
          textPrimary: "#FDF2F4", textSecondary: "#D4A0A8", textMuted: "#8A6A70",
          border: "rgba(255,255,255,0.06)", focus: "#E11D48", overlay: "rgba(0,0,0,0.7)",
        },
        typography: { headingFont: "'Playfair Display', Georgia, serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),
];
