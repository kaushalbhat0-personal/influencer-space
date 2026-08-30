import type { ThemeDefinition } from "../types-new";
import { createTheme } from "./index";

export const educationThemes: ThemeDefinition[] = [
  createTheme(
    "com.creatos.coach",
    "coach",
    "Coach",
    "Calm blue-green theme for life coaches, mentors, and personal development professionals",
    "coach & education",
    ["calm", "blue", "green", "coach", "mentor", "trustworthy"],
    {
      premium: false,
      featured: true,
      industries: ["coach", "coach & education"],
      supportedBlueprints: ["com.creatos.business", "com.creatos.education"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-07-01",
      updatedAt: "2025-03-10",
      supportsDarkMode: true,
      colorSwatches: ["#0F766E", "#14B8A6", "#99F6E4", "#FFFFFF"],
      family: "minimal",
      variantGroup: "minimal-coach",
      lightTokens: {
        colors: {
          primary: "#0F766E", secondary: "#14B8A6", accent: "#5EEAD4",
          background: "#FFFFFF", surface: "#F0FDFA", surfaceSecondary: "#CCFBF1",
          textPrimary: "#0F172A", textSecondary: "#475569", textMuted: "#94A3B8",
          border: "#E2E8F0", focus: "#14B8A6", overlay: "rgba(0,0,0,0.5)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#5EEAD4", secondary: "#2DD4BF", accent: "#99F6E4",
          background: "#0F172A", surface: "#1E293B", surfaceSecondary: "#334155",
          textPrimary: "#F1F5F9", textSecondary: "#CBD5E1", textMuted: "#94A3B8",
          border: "rgba(255,255,255,0.06)", focus: "#5EEAD4", overlay: "rgba(0,0,0,0.6)",
        },
        typography: { headingFont: "Inter, system-ui, sans-serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),

  createTheme(
    "com.creatos.academy",
    "academy",
    "Academy",
    "Traditional navy and gold theme for educational institutions and online courses",
    "coach & education",
    ["navy", "gold", "academic", "traditional", "formal", "coach & education"],
    {
      premium: false,
      industries: ["coach & education"],
      supportedBlueprints: ["com.creatos.education"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-08-01",
      updatedAt: "2025-02-20",
      colorSwatches: ["#1E3A5F", "#D4A017", "#F5F5DC", "#FFFFFF"],
      family: "editorial",
      variantGroup: "editorial-academy-legacy",
      lightTokens: {
        colors: {
          primary: "#1E3A5F", secondary: "#D4A017", accent: "#F5C518",
          background: "#FFFFFF", surface: "#F8F9FA", surfaceSecondary: "#F1F3F5",
          textPrimary: "#0F172A", textSecondary: "#495057", textMuted: "#868E96",
          border: "#DEE2E6", focus: "#D4A017", overlay: "rgba(0,0,0,0.5)",
        },
        typography: { headingFont: "Literata, Georgia, serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
      darkTokens: {
        colors: {
          primary: "#F5C518", secondary: "#D4A017", accent: "#FFF3B0",
          background: "#0F172A", surface: "#1E293B", surfaceSecondary: "#334155",
          textPrimary: "#F1F5F9", textSecondary: "#CBD5E1", textMuted: "#94A3B8",
          border: "rgba(255,255,255,0.06)", focus: "#F5C518", overlay: "rgba(0,0,0,0.6)",
        },
        typography: { headingFont: "Literata, Georgia, serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),

  createTheme(
    "com.creatos.mentor",
    "mentor",
    "Mentor",
    "Approachable teal and coral theme for mentors, tutors, and skill-sharing platforms",
    "coach & education",
    ["teal", "coral", "approachable", "friendly", "modern", "coach & education"],
    {
      premium: true,
      industries: ["coach & education", "coach"],
      supportedBlueprints: ["com.creatos.education", "com.creatos.business"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-09-10",
      updatedAt: "2025-01-30",
      supportsDarkMode: true,
      colorSwatches: ["#0D9488", "#F43F5E", "#5EEAD4", "#FFFFFF"],
      family: "creator",
      variantGroup: "creator-mentor",
      lightTokens: {
        colors: {
          primary: "#0D9488", secondary: "#F43F5E", accent: "#2DD4BF",
          background: "#FFFFFF", surface: "#F0FDF4", surfaceSecondary: "#DCFCE7",
          textPrimary: "#0F172A", textSecondary: "#475569", textMuted: "#94A3B8",
          border: "#E2E8F0", focus: "#0D9488", overlay: "rgba(0,0,0,0.5)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#2DD4BF", secondary: "#FB7185", accent: "#5EEAD4",
          background: "#0F172A", surface: "#1E293B", surfaceSecondary: "#334155",
          textPrimary: "#F1F5F9", textSecondary: "#CBD5E1", textMuted: "#94A3B8",
          border: "rgba(255,255,255,0.06)", focus: "#2DD4BF", overlay: "rgba(0,0,0,0.6)",
        },
        typography: { headingFont: "'Plus Jakarta Sans', Inter, system-ui, sans-serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),
];
