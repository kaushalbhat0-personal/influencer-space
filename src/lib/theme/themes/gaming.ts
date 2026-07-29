import type { ThemeDefinition } from "../types-new";
import { createTheme } from "./index";

export const gamingThemes: ThemeDefinition[] = [
  createTheme(
    "com.creatos.cyber-arena",
    "cyber-arena",
    "Cyber Arena",
    "High-energy cyan and magenta on deep dark for esports and gaming communities",
    "gaming",
    ["cyber", "cyan", "magenta", "gaming", "neon", "dark", "energetic"],
    {
      premium: false,
      featured: true,
      industries: ["gaming", "creator"],
      supportedBlueprints: ["com.creatos.gaming", "com.creatos.creator"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-08-01",
      updatedAt: "2025-03-15",
      colorSwatches: ["#06B6D4", "#D946EF", "#22D3EE", "#09090B"],
      lightTokens: {
        colors: {
          primary: "#06B6D4", secondary: "#D946EF", accent: "#22D3EE",
          background: "#09090B", surface: "#18181B", surfaceSecondary: "#27272A",
          textPrimary: "#FAFAFA", textSecondary: "#A1A1AA", textMuted: "#71717A",
          border: "rgba(255,255,255,0.08)", focus: "#06B6D4", overlay: "rgba(0,0,0,0.7)",
        },
      },
    },
  ),

  createTheme(
    "com.creatos.esports",
    "esports",
    "Esports",
    "Fire red and orange theme built for competitive gaming and esports teams",
    "gaming",
    ["fire", "red", "orange", "gaming", "competitive", "dark"],
    {
      premium: true,
      industries: ["gaming"],
      supportedBlueprints: ["com.creatos.gaming"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-09-15",
      updatedAt: "2025-02-28",
      colorSwatches: ["#DC2626", "#EA580C", "#F97316", "#0A0A0A"],
      lightTokens: {
        colors: {
          primary: "#DC2626", secondary: "#EA580C", accent: "#F97316",
          background: "#0A0A0A", surface: "#141414", surfaceSecondary: "#1F1F1F",
          textPrimary: "#FFFFFF", textSecondary: "#A3A3A3", textMuted: "#6B6B6B",
          border: "rgba(255,255,255,0.06)", focus: "#EA580C", overlay: "rgba(0,0,0,0.75)",
        },
      },
    },
  ),

  createTheme(
    "com.creatos.game-stream",
    "game-stream",
    "Game Stream",
    "Purple and electric green dark theme for game streamers and content creators",
    "gaming",
    ["purple", "green", "gaming", "stream", "neon", "dark"],
    {
      premium: false,
      industries: ["gaming", "creator"],
      supportedBlueprints: ["com.creatos.gaming", "com.creatos.creator"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-10-10",
      updatedAt: "2025-01-25",
      colorSwatches: ["#8B5CF6", "#22C55E", "#A78BFA", "#0F0A1A"],
      lightTokens: {
        colors: {
          primary: "#8B5CF6", secondary: "#22C55E", accent: "#A78BFA",
          background: "#0F0A1A", surface: "#1A122A", surfaceSecondary: "#251C3A",
          textPrimary: "#F3EEFF", textSecondary: "#A99DD0", textMuted: "#7A6F9A",
          border: "rgba(255,255,255,0.06)", focus: "#8B5CF6", overlay: "rgba(0,0,0,0.7)",
        },
      },
    },
  ),
];
