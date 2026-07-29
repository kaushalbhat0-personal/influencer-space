import type { ThemeDefinition } from "../types-new";
import { createTheme } from "./index";

export const businessThemes: ThemeDefinition[] = [
  createTheme(
    "com.creatos.corporate-blue",
    "corporate-blue",
    "Corporate Blue",
    "Trustworthy navy blue corporate theme for professional businesses and consultants",
    "business & agency",
    ["corporate", "blue", "professional", "clean", "navy"],
    {
      premium: false,
      featured: true,
      industries: ["business & agency", "agency"],
      supportedBlueprints: ["com.creatos.business", "com.creatos.agency"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-06-15",
      updatedAt: "2025-03-10",
      supportsDarkMode: true,
      colorSwatches: ["#1E40AF", "#2563EB", "#DBEAFE", "#FFFFFF"],
      lightTokens: {
        colors: {
          primary: "#1E40AF", secondary: "#2563EB", accent: "#60A5FA",
          background: "#FFFFFF", surface: "#F8FAFC", surfaceSecondary: "#F1F5F9",
          textPrimary: "#0F172A", textSecondary: "#475569", textMuted: "#94A3B8",
          border: "#E2E8F0", focus: "#2563EB", overlay: "rgba(0,0,0,0.5)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#60A5FA", secondary: "#3B82F6", accent: "#93C5FD",
          background: "#0F172A", surface: "#1E293B", surfaceSecondary: "#334155",
          textPrimary: "#F1F5F9", textSecondary: "#CBD5E1", textMuted: "#94A3B8",
          border: "rgba(255,255,255,0.06)", focus: "#60A5FA", overlay: "rgba(0,0,0,0.6)",
        },
      },
    },
  ),

  createTheme(
    "com.creatos.executive",
    "executive",
    "Executive",
    "Premium dark charcoal with gold accents for executives and high-end consulting",
    "business & agency",
    ["executive", "gold", "charcoal", "premium", "elegant", "dark"],
    {
      premium: true,
      industries: ["business & agency", "luxury", "agency"],
      supportedBlueprints: ["com.creatos.business", "com.creatos.agency"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.2.0",
      releaseDate: "2024-09-01",
      updatedAt: "2025-02-15",
      colorSwatches: ["#1C1917", "#D97706", "#FCD34D", "#0C0A09"],
      lightTokens: {
        colors: {
          primary: "#1C1917", secondary: "#D97706", accent: "#FCD34D",
          background: "#0C0A09", surface: "#1C1917", surfaceSecondary: "#292524",
          textPrimary: "#F5F5F4", textSecondary: "#A8A29E", textMuted: "#78716C",
          border: "rgba(255,255,255,0.08)", focus: "#D97706", overlay: "rgba(0,0,0,0.7)",
        },
      },
    },
  ),

  createTheme(
    "com.creatos.startup",
    "startup",
    "Startup",
    "Vibrant modern theme with teal and orange for startups and tech companies",
    "business & agency",
    ["startup", "teal", "orange", "modern", "vibrant", "tech"],
    {
      premium: false,
      featured: true,
      industries: ["business & agency", "creator"],
      supportedBlueprints: ["com.creatos.business", "com.creatos.creator"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-07-01",
      updatedAt: "2025-01-30",
      colorSwatches: ["#0D9488", "#EA580C", "#99F6E4", "#FFFFFF"],
      lightTokens: {
        colors: {
          primary: "#0D9488", secondary: "#EA580C", accent: "#2DD4BF",
          background: "#FFFFFF", surface: "#F8FAFC", surfaceSecondary: "#F1F5F9",
          textPrimary: "#0F172A", textSecondary: "#475569", textMuted: "#94A3B8",
          border: "#E2E8F0", focus: "#0D9488", overlay: "rgba(0,0,0,0.5)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#2DD4BF", secondary: "#F97316", accent: "#5EEAD4",
          background: "#0F172A", surface: "#1F2937", surfaceSecondary: "#374151",
          textPrimary: "#F1F5F9", textSecondary: "#CBD5E1", textMuted: "#94A3B8",
          border: "rgba(255,255,255,0.06)", focus: "#2DD4BF", overlay: "rgba(0,0,0,0.6)",
        },
      },
    },
  ),

  createTheme(
    "com.creatos.professional",
    "professional",
    "Professional",
    "Clean gray and blue theme for consultants, freelancers, and service professionals",
    "business & agency",
    ["professional", "gray", "blue", "clean", "minimal", "service"],
    {
      premium: false,
      industries: ["business & agency", "agency"],
      supportedBlueprints: ["com.creatos.business"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-06-01",
      updatedAt: "2025-03-05",
      supportsDarkMode: true,
      colorSwatches: ["#334155", "#3B82F6", "#F8FAFC", "#FFFFFF"],
      lightTokens: {
        colors: {
          primary: "#334155", secondary: "#3B82F6", accent: "#60A5FA",
          background: "#FFFFFF", surface: "#F8FAFC", surfaceSecondary: "#F1F5F9",
          textPrimary: "#0F172A", textSecondary: "#475569", textMuted: "#94A3B8",
          border: "#E2E8F0", focus: "#3B82F6", overlay: "rgba(0,0,0,0.5)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#E2E8F0", secondary: "#60A5FA", accent: "#93C5FD",
          background: "#0F172A", surface: "#1E293B", surfaceSecondary: "#334155",
          textPrimary: "#F1F5F9", textSecondary: "#CBD5E1", textMuted: "#94A3B8",
          border: "rgba(255,255,255,0.06)", focus: "#60A5FA", overlay: "rgba(0,0,0,0.6)",
        },
      },
    },
  ),
];
