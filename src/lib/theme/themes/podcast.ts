import type { ThemeDefinition } from "../types-new";
import { createTheme } from "./index";

export const podcastThemes: ThemeDefinition[] = [
  createTheme(
    "com.creatos.podcast-studio",
    "podcast-studio",
    "Podcast Studio",
    "Audio-wave purple theme designed for podcasters and audio content creators",
    "podcast",
    ["podcast", "purple", "audio", "dark", "studio", "professional"],
    {
      premium: false,
      featured: true,
      industries: ["podcast", "creator"],
      supportedBlueprints: ["com.creatos.podcast", "com.creatos.creator"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-07-15",
      updatedAt: "2025-03-10",
      colorSwatches: ["#6D28D9", "#8B5CF6", "#C4B5FD", "#0F0A1A"],
      lightTokens: {
        colors: {
          primary: "#6D28D9", secondary: "#8B5CF6", accent: "#C4B5FD",
          background: "#0F0A1A", surface: "#1A122A", surfaceSecondary: "#251C3A",
          textPrimary: "#F3EEFF", textSecondary: "#B0A5D0", textMuted: "#7A6F9A",
          border: "rgba(255,255,255,0.06)", focus: "#8B5CF6", overlay: "rgba(0,0,0,0.7)",
        },
      },
    },
  ),

  createTheme(
    "com.creatos.audio-creator",
    "audio-creator",
    "Audio Creator",
    "Warm amber and deep brown palette for audio creators, musicians, and sound producers",
    "podcast",
    ["audio", "amber", "warm", "music", "creative", "brown"],
    {
      premium: false,
      industries: ["podcast", "creator"],
      supportedBlueprints: ["com.creatos.podcast", "com.creatos.creator"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-08-20",
      updatedAt: "2025-02-01",
      colorSwatches: ["#92400E", "#F59E0B", "#FDE68A", "#1C1917"],
      lightTokens: {
        colors: {
          primary: "#92400E", secondary: "#F59E0B", accent: "#FBBF24",
          background: "#1C1917", surface: "#292524", surfaceSecondary: "#44403C",
          textPrimary: "#F5F5F4", textSecondary: "#A8A29E", textMuted: "#78716C",
          border: "rgba(255,255,255,0.06)", focus: "#F59E0B", overlay: "rgba(0,0,0,0.6)",
        },
      },
    },
  ),

  createTheme(
    "com.creatos.voice",
    "voice",
    "Voice",
    "Clean dark blue theme optimized for voice-first content and podcast show notes",
    "podcast",
    ["voice", "blue", "clean", "dark", "minimal", "readable"],
    {
      premium: true,
      industries: ["podcast"],
      supportedBlueprints: ["com.creatos.podcast"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-10-05",
      updatedAt: "2025-01-15",
      colorSwatches: ["#1E3A5F", "#3B82F6", "#93C5FD", "#0F172A"],
      lightTokens: {
        colors: {
          primary: "#1E3A5F", secondary: "#3B82F6", accent: "#93C5FD",
          background: "#0F172A", surface: "#1E293B", surfaceSecondary: "#334155",
          textPrimary: "#F1F5F9", textSecondary: "#CBD5E1", textMuted: "#94A3B8",
          border: "rgba(255,255,255,0.06)", focus: "#3B82F6", overlay: "rgba(0,0,0,0.6)",
        },
      },
    },
  ),
];
