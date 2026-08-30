import type { ThemeDefinition } from "../types-new";
import { createTheme } from "./index";

export const restaurantThemes: ThemeDefinition[] = [
  createTheme(
    "com.creatos.forest-canopy",
    "forest-canopy",
    "Forest Canopy",
    "Earthy greens with warm natural tones for restaurants focused on organic and farm-to-table",
    "food & restaurant",
    ["green", "earthy", "natural", "warm", "organic", "rustic"],
    {
      premium: false,
      featured: true,
      industries: ["food & restaurant"],
      supportedBlueprints: ["com.creatos.restaurant"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-06-15",
      updatedAt: "2025-02-28",
      colorSwatches: ["#166534", "#22C55E", "#D97706", "#052E16"],
      family: "organic-aurora",
      variantGroup: "aurora-forest",
      lightTokens: {
        colors: {
          primary: "#166534", secondary: "#22C55E", accent: "#D97706",
          background: "#052E16", surface: "#0F3D1E", surfaceSecondary: "#1A4F2C",
          textPrimary: "#F0FDF4", textSecondary: "#BBF7D0", textMuted: "#86EFAC",
          border: "rgba(255,255,255,0.06)", focus: "#22C55E", overlay: "rgba(0,0,0,0.6)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#166534", secondary: "#22C55E", accent: "#D97706",
          background: "#052E16", surface: "#0F3D1E", surfaceSecondary: "#1A4F2C",
          textPrimary: "#F0FDF4", textSecondary: "#BBF7D0", textMuted: "#86EFAC",
          border: "rgba(255,255,255,0.06)", focus: "#22C55E", overlay: "rgba(0,0,0,0.6)",
        },
        typography: { headingFont: "Outfit, Inter, system-ui, sans-serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),

  createTheme(
    "com.creatos.modern-restaurant",
    "modern-restaurant",
    "Modern Restaurant",
    "Warm beige and brown palette for modern casual dining and contemporary restaurants",
    "food & restaurant",
    ["warm", "beige", "brown", "modern", "dining", "food & restaurant"],
    {
      premium: false,
      industries: ["food & restaurant"],
      supportedBlueprints: ["com.creatos.restaurant"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-07-10",
      updatedAt: "2025-03-01",
      supportsDarkMode: true,
      colorSwatches: ["#78350F", "#D97706", "#FEF3C7", "#FFFBEB"],
      family: "minimal",
      variantGroup: "minimal-restaurant",
      lightTokens: {
        colors: {
          primary: "#78350F", secondary: "#D97706", accent: "#F59E0B",
          background: "#FFFBEB", surface: "#FEF3C7", surfaceSecondary: "#FDE68A",
          textPrimary: "#292524", textSecondary: "#78716C", textMuted: "#A8A29E",
          border: "#E7E5E4", focus: "#D97706", overlay: "rgba(0,0,0,0.4)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#FDE68A", secondary: "#F59E0B", accent: "#FBBF24",
          background: "#1C1917", surface: "#292524", surfaceSecondary: "#44403C",
          textPrimary: "#F5F5F4", textSecondary: "#A8A29E", textMuted: "#78716C",
          border: "rgba(255,255,255,0.06)", focus: "#FDE68A", overlay: "rgba(0,0,0,0.6)",
        },
        typography: { headingFont: "Inter, system-ui, sans-serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),

  createTheme(
    "com.creatos.fine-dining",
    "fine-dining",
    "Fine Dining",
    "Sophisticated deep burgundy with gold for upscale restaurants and culinary brands",
    "food & restaurant",
    ["burgundy", "gold", "fine-dining", "elegant", "sophisticated", "dark"],
    {
      premium: true,
      industries: ["food & restaurant", "luxury"],
      supportedBlueprints: ["com.creatos.restaurant", "com.creatos.luxury"],
      requiredCapabilities: ["premium_themes"],
      minimumPlatformVersion: "1.2.0",
      releaseDate: "2024-09-01",
      updatedAt: "2025-01-30",
      colorSwatches: ["#2D0A0A", "#D97706", "#991B1B", "#1A0505"],
      family: "luxury",
      variantGroup: "luxury-dining",
      lightTokens: {
        colors: {
          primary: "#2D0A0A", secondary: "#D97706", accent: "#FCD34D",
          background: "#1A0505", surface: "#2D0A0A", surfaceSecondary: "#3D1515",
          textPrimary: "#FEF2F2", textSecondary: "#D4A0A0", textMuted: "#8A6060",
          border: "rgba(255,255,255,0.06)", focus: "#D97706", overlay: "rgba(0,0,0,0.7)",
        },
      },
      darkTokens: {
        colors: {
          primary: "#2D0A0A", secondary: "#D97706", accent: "#FCD34D",
          background: "#1A0505", surface: "#2D0A0A", surfaceSecondary: "#3D1515",
          textPrimary: "#FEF2F2", textSecondary: "#D4A0A0", textMuted: "#8A6060",
          border: "rgba(255,255,255,0.06)", focus: "#D97706", overlay: "rgba(0,0,0,0.7)",
        },
        typography: { headingFont: "'Playfair Display', Georgia, serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),

  createTheme(
    "com.creatos.bistro",
    "bistro",
    "Bistro",
    "Rustic olive and terracotta theme for bistros, cafes, and artisan food brands",
    "food & restaurant",
    ["olive", "terracotta", "rustic", "cafe", "bistro", "warm"],
    {
      premium: false,
      industries: ["food & restaurant"],
      supportedBlueprints: ["com.creatos.restaurant"],
      minimumPlatformVersion: "1.0.0",
      releaseDate: "2024-08-05",
      updatedAt: "2025-02-15",
      colorSwatches: ["#4A5D23", "#C2410C", "#D97706", "#F5F5DC"],
      family: "editorial",
      variantGroup: "editorial-bistro",
      lightTokens: {
        colors: {
          primary: "#4A5D23", secondary: "#C2410C", accent: "#D97706",
          background: "#F5F5DC", surface: "#F0ECD8", surfaceSecondary: "#EBE4CA",
          textPrimary: "#292524", textSecondary: "#78716C", textMuted: "#A8A29E",
          border: "#D6D3C8", focus: "#C2410C", overlay: "rgba(0,0,0,0.4)",
        },
        typography: { headingFont: "Literata, Georgia, serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
      darkTokens: {
        colors: {
          primary: "#A3B56A", secondary: "#EA580C", accent: "#F59E0B",
          background: "#1A1C14", surface: "#26281C", surfaceSecondary: "#333826",
          textPrimary: "#F5F5DC", textSecondary: "#C0C0A8", textMuted: "#888870",
          border: "rgba(255,255,255,0.06)", focus: "#EA580C", overlay: "rgba(0,0,0,0.6)",
        },
        typography: { headingFont: "Literata, Georgia, serif", bodyFont: "Inter, system-ui, sans-serif" },
      },
    },
  ),
];
