import type { ThemeDefinition } from "../types-new";
import { createTheme } from "./index";

export const portfolioThemes: ThemeDefinition[] = [
  createTheme(
    "com.creatos.midnight-ocean",
    "midnight-ocean",
    "Midnight Ocean",
    "Deep ocean blues with teal and amber accents for portfolios with a professional edge",
    "portfolio & creative",
    ["dark", "blue", "teal", "professional", "ocean"],
    {
      premium: false,
      featured: true,
      industries: ["portfolio & creative", "photography"],
      supportedBlueprints: ["com.creatos.portfolio"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-06-01",
      updatedAt: "2025-02-20",
      colorSwatches: ["#1e3a5f", "#0ea5e9", "#f59e0b", "#0f172a"],
      lightTokens: {
        colors: {
          primary: "#1e3a5f", secondary: "#0ea5e9", accent: "#f59e0b",
          background: "#0f172a", surface: "#1e293b", surfaceSecondary: "#334155",
          textPrimary: "#f8fafc", textSecondary: "#cbd5e1", textMuted: "#94a3b8",
          border: "rgba(255,255,255,0.06)", focus: "#0ea5e9", overlay: "rgba(0,0,0,0.6)",
        },
      },
    },
  ),

  createTheme(
    "com.creatos.minimal-portfolio",
    "minimal-portfolio",
    "Minimal Portfolio",
    "Clean, distraction-free light theme that lets your work take center stage",
    "portfolio & creative",
    ["light", "clean", "minimal", "professional", "minimalist"],
    {
      premium: false,
      industries: ["portfolio & creative", "photography"],
      supportedBlueprints: ["com.creatos.portfolio"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-06-10",
      updatedAt: "2025-03-01",
      supportsDarkMode: true,
      colorSwatches: ["#1E293B", "#475569", "#3B82F6", "#FFFFFF"],
      lightTokens: {
        colors: {
          primary: "#1E293B", secondary: "#475569", accent: "#3B82F6",
          background: "#FFFFFF", surface: "#F8FAFC", surfaceSecondary: "#F1F5F9",
          textPrimary: "#0F172A", textSecondary: "#475569", textMuted: "#94A3B8",
          border: "#E2E8F0", focus: "#3B82F6", overlay: "rgba(0,0,0,0.5)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#E2E8F0", secondary: "#94A3B8", accent: "#60A5FA",
          background: "#0F172A", surface: "#1E293B", surfaceSecondary: "#334155",
          textPrimary: "#F1F5F9", textSecondary: "#CBD5E1", textMuted: "#94A3B8",
          border: "rgba(255,255,255,0.06)", focus: "#60A5FA", overlay: "rgba(0,0,0,0.6)",
        },
      },
    },
  ),

  createTheme(
    "com.creatos.designer",
    "designer",
    "Designer",
    "Creative pink and purple palette for designers, illustrators and visual artists",
    "portfolio & creative",
    ["creative", "pink", "purple", "designer", "artistic"],
    {
      premium: true,
      industries: ["portfolio & creative", "creator"],
      supportedBlueprints: ["com.creatos.portfolio", "com.creatos.creator"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-08-20",
      updatedAt: "2025-01-15",
      colorSwatches: ["#BE185D", "#EC4899", "#FDF2F8", "#FFFFFF"],
      lightTokens: {
        colors: {
          primary: "#BE185D", secondary: "#EC4899", accent: "#F472B6",
          background: "#FFFFFF", surface: "#FFF1F2", surfaceSecondary: "#FDF2F8",
          textPrimary: "#1F0A1A", textSecondary: "#6B3A5A", textMuted: "#A97A94",
          border: "#FCE7F3", focus: "#EC4899", overlay: "rgba(0,0,0,0.5)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#F472B6", secondary: "#EC4899", accent: "#F9A8D4",
          background: "#1A0A14", surface: "#2D1424", surfaceSecondary: "#3D1F34",
          textPrimary: "#FDF2F8", textSecondary: "#FBCFE8", textMuted: "#A97A94",
          border: "rgba(255,255,255,0.08)", focus: "#F472B6", overlay: "rgba(0,0,0,0.7)",
        },
      },
    },
  ),

  createTheme(
    "com.creatos.photographer",
    "photographer",
    "Photographer",
    "Clean dark theme designed to make photography and visual work pop",
    "portfolio & creative",
    ["photography", "dark", "clean", "minimal", "visual"],
    {
      premium: false,
      industries: ["photography", "portfolio & creative"],
      supportedBlueprints: ["com.creatos.portfolio", "com.creatos.photography"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-07-15",
      updatedAt: "2025-02-10",
      colorSwatches: ["#1A1A1A", "#FAFAFA", "#E50914", "#FFFFFF"],
      lightTokens: {
        colors: {
          primary: "#1A1A1A", secondary: "#FAFAFA", accent: "#E50914",
          background: "#0D0D0D", surface: "#1A1A1A", surfaceSecondary: "#2A2A2A",
          textPrimary: "#FAFAFA", textSecondary: "#A3A3A3", textMuted: "#6B6B6B",
          border: "rgba(255,255,255,0.06)", focus: "#FAFAFA", overlay: "rgba(0,0,0,0.8)",
        },
      },
    },
  ),
];
