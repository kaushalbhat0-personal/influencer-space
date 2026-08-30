import type { ThemeDefinition } from "../types-new";
import { createTheme } from "./index";

export const creatorThemes: ThemeDefinition[] = [
  createTheme(
    "com.creatos.neon-dark",
    "neon-dark",
    "Neon Dark",
    "Bold neon accents on deep dark background — the signature CreatorOS dark theme",
    "creator",
    ["dark", "neon", "bold", "gaming", "popular"],
    {
      premium: false,
      featured: true,
      industries: ["creator", "gaming"],
      supportedBlueprints: ["com.creatos.creator", "com.creatos.gaming"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-06-01",
      updatedAt: "2025-03-15",
      colorSwatches: ["#2D1B69", "#00f5ff", "#ff00e5", "#09090B"],
      family: "tech-cyber",
      variantGroup: "tech-neon-legacy",
      lightTokens: {
        colors: {
          primary: "#2D1B69", secondary: "#00f5ff", accent: "#ff00e5",
          background: "#09090B", surface: "#18181B", surfaceSecondary: "#27272A",
          textPrimary: "#FAFAFA", textSecondary: "#A1A1AA", textMuted: "#71717A",
          border: "rgba(255,255,255,0.08)", focus: "#00f5ff", overlay: "rgba(0,0,0,0.7)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#2D1B69", secondary: "#00f5ff", accent: "#ff00e5",
          background: "#09090B", surface: "#18181B", surfaceSecondary: "#27272A",
          textPrimary: "#FAFAFA", textSecondary: "#A1A1AA", textMuted: "#71717A",
          border: "rgba(255,255,255,0.08)", focus: "#00f5ff", overlay: "rgba(0,0,0,0.7)",
        },
        typography: { headingFont: "'JetBrains Mono', monospace", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),

  createTheme(
    "com.creatos.creator-studio",
    "creator-studio",
    "Creator Studio",
    "Vibrant purple and cyan palette built for content creators who want to stand out",
    "creator",
    ["vibrant", "purple", "cyan", "modern", "studio"],
    {
      premium: false,
      featured: true,
      industries: ["creator", "photography"],
      supportedBlueprints: ["com.creatos.creator", "com.creatos.portfolio"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-08-15",
      updatedAt: "2025-02-10",
      supportsDarkMode: true,
      colorSwatches: ["#7C3AED", "#06B6D4", "#A78BFA", "#FFFFFF"],
      family: "creator",
      variantGroup: "creator-studio",
      lightTokens: {
        colors: {
          primary: "#7C3AED", secondary: "#06B6D4", accent: "#A78BFA",
          background: "#FFFFFF", surface: "#FAFAFA", surfaceSecondary: "#F4F4F5",
          textPrimary: "#18181B", textSecondary: "#52525B", textMuted: "#A1A1AA",
          border: "#E4E4E7", focus: "#7C3AED", overlay: "rgba(0,0,0,0.5)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#A78BFA", secondary: "#22D3EE", accent: "#7C3AED",
          background: "#0B0B1A", surface: "#12122A", surfaceSecondary: "#1C1C3A",
          textPrimary: "#EDEDFF", textSecondary: "#A1A1D0", textMuted: "#6B6B8A",
          border: "rgba(255,255,255,0.06)", focus: "#A78BFA", overlay: "rgba(0,0,0,0.7)",
        },
        typography: { headingFont: "'Plus Jakarta Sans', Inter, system-ui, sans-serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),

  createTheme(
    "com.creatos.creator-bold",
    "creator-bold",
    "Creator Bold",
    "Bold red and black maximalist theme for creators who make a statement",
    "creator",
    ["bold", "red", "dark", "maximalist", "dramatic"],
    {
      premium: true,
      industries: ["creator", "gaming"],
      supportedBlueprints: ["com.creatos.creator", "com.creatos.gaming"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.2.0",
      releaseDate: "2024-10-01",
      updatedAt: "2025-01-20",
      colorSwatches: ["#DC2626", "#171717", "#F87171", "#000000"],
      family: "brutalist",
      variantGroup: "brutalist-bold",
      lightTokens: {
        colors: {
          primary: "#DC2626", secondary: "#F87171", accent: "#FCD34D",
          background: "#0A0A0A", surface: "#171717", surfaceSecondary: "#262626",
          textPrimary: "#FAFAFA", textSecondary: "#A3A3A3", textMuted: "#737373",
          border: "rgba(255,255,255,0.08)", focus: "#DC2626", overlay: "rgba(0,0,0,0.8)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#DC2626", secondary: "#F87171", accent: "#FCD34D",
          background: "#0A0A0A", surface: "#171717", surfaceSecondary: "#262626",
          textPrimary: "#FAFAFA", textSecondary: "#A3A3A3", textMuted: "#737373",
          border: "rgba(255,255,255,0.08)", focus: "#DC2626", overlay: "rgba(0,0,0,0.8)",
        },
        typography: { headingFont: "'Courier Prime', Courier, monospace", bodyFont: "'Courier Prime', Courier, monospace" },
      },
    },
  ),

  createTheme(
    "com.creatos.stream-vibe",
    "stream-vibe",
    "Stream Vibe",
    "Energetic neon green on dark for streamers and live content creators",
    "creator",
    ["neon", "green", "dark", "stream", "energetic"],
    {
      premium: false,
      industries: ["creator", "gaming"],
      supportedBlueprints: ["com.creatos.creator", "com.creatos.gaming"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-09-10",
      updatedAt: "2025-02-28",
      colorSwatches: ["#00FF88", "#171717", "#39FF14", "#0A0A0A"],
      family: "tech-cyber",
      variantGroup: "tech-vibe",
      lightTokens: {
        colors: {
          primary: "#00FF88", secondary: "#39FF14", accent: "#00CCFF",
          background: "#0A0A0A", surface: "#141414", surfaceSecondary: "#1F1F1F",
          textPrimary: "#FFFFFF", textSecondary: "#A0A0A0", textMuted: "#6B6B6B",
          border: "rgba(255,255,255,0.06)", focus: "#00FF88", overlay: "rgba(0,0,0,0.75)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#00FF88", secondary: "#39FF14", accent: "#00CCFF",
          background: "#0A0A0A", surface: "#141414", surfaceSecondary: "#1F1F1F",
          textPrimary: "#FFFFFF", textSecondary: "#A0A0A0", textMuted: "#6B6B6B",
          border: "rgba(255,255,255,0.06)", focus: "#00FF88", overlay: "rgba(0,0,0,0.75)",
        },
        typography: { headingFont: "'JetBrains Mono', monospace", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),

  createTheme(
    "com.creatos.creator-pro",
    "creator-pro",
    "Creator Pro",
    "Professional deep blue theme for serious content creators and agencies",
    "creator",
    ["professional", "blue", "dark", "clean", "minimal"],
    {
      premium: true,
      industries: ["creator", "business", "agency"],
      supportedBlueprints: ["com.creatos.creator", "com.creatos.agency"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-07-20",
      updatedAt: "2025-03-01",
      colorSwatches: ["#1E3A8A", "#3B82F6", "#60A5FA", "#0F172A"],
      family: "executive",
      variantGroup: "executive-pro",
      lightTokens: {
        colors: {
          primary: "#1E3A8A", secondary: "#3B82F6", accent: "#60A5FA",
          background: "#0F172A", surface: "#1E293B", surfaceSecondary: "#334155",
          textPrimary: "#F8FAFC", textSecondary: "#CBD5E1", textMuted: "#94A3B8",
          border: "rgba(255,255,255,0.06)", focus: "#3B82F6", overlay: "rgba(0,0,0,0.6)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#1E3A8A", secondary: "#3B82F6", accent: "#60A5FA",
          background: "#0F172A", surface: "#1E293B", surfaceSecondary: "#334155",
          textPrimary: "#F8FAFC", textSecondary: "#CBD5E1", textMuted: "#94A3B8",
          border: "rgba(255,255,255,0.06)", focus: "#3B82F6", overlay: "rgba(0,0,0,0.6)",
        },
        typography: { headingFont: "Inter, system-ui, sans-serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),
];
