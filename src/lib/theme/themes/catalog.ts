/**
 * Theme Catalog Expansion — IMPLEMENTATION-25.
 *
 * 20 additional professionally-designed themes (total catalog ≈ 50). Each theme
 * is pure configuration — a curated palette + metadata. Adding theme #51, #100
 * or #500 requires only another entry here; no engine/runtime/UI code changes.
 */
import type { ThemeCategory } from "../types-new";
import { createTheme } from "./index";

interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
}

function makeTheme(o: {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ThemeCategory;
  tags: string[];
  featured?: boolean;
  recommended?: boolean;
  industries?: string[];
  releaseDate?: string;
  updatedAt?: string;
  swatches?: string[];
  dark: Palette;
  light?: Palette;
  fonts?: { heading?: string; body?: string };
}): ReturnType<typeof createTheme> {
  return createTheme(o.id, o.slug, o.name, o.description, o.category, o.tags, {
    featured: o.featured,
    recommended: o.recommended,
    industries: o.industries,
    releaseDate: o.releaseDate,
    updatedAt: o.updatedAt,
    colorSwatches: o.swatches,
    supportsDarkMode: true,
    lightTokens: o.light ? { colors: o.light } : undefined,
    darkTokens: {
      colors: o.dark,
      typography: o.fonts ? { headingFont: o.fonts.heading, bodyFont: o.fonts.body } : undefined,
    },
  });
}

const D = {
  dark: (primary: string, secondary: string, accent: string, bg: string, surface: string, surfaceSecondary: string): Palette => ({
    primary, secondary, accent,
    bg, surface, surfaceSecondary,
    textPrimary: "#FAFAFA", textSecondary: "#A1A1AA", textMuted: "#71717A",
    border: "rgba(255,255,255,0.08)",
  }),
  light: (primary: string, secondary: string, accent: string, bg: string, surface: string, surfaceSecondary: string): Palette => ({
    primary, secondary, accent,
    bg, surface, surfaceSecondary,
    textPrimary: "#18181B", textSecondary: "#52525B", textMuted: "#A1A1AA",
    border: "#E4E4E7",
  }),
};

export const catalogThemes: ReturnType<typeof createTheme>[] = [
  makeTheme({
    id: "com.creatos.creator-dark", slug: "creator-dark", name: "Creator Dark",
    description: "A refined charcoal and electric violet theme built for modern creators who want a professional dark presence.",
    category: "creator", tags: ["dark", "violet", "professional", "creator"],
    featured: true, recommended: true, industries: ["creator"],
    releaseDate: "2025-01-05", updatedAt: "2025-06-01", swatches: ["#7C3AED", "#A78BFA", "#18181B", "#0B0B1A"],
    dark: D.dark("#7C3AED", "#A78BFA", "#22D3EE", "#0B0B1A", "#12122A", "#1C1C3A"),
  }),
  makeTheme({
    id: "com.creatos.creator-light", slug: "creator-light", name: "Creator Light",
    description: "Clean light theme with a soft violet identity — bright, friendly and content-first.",
    category: "creator", tags: ["light", "violet", "clean", "minimal"],
    releaseDate: "2025-01-12", updatedAt: "2025-06-08", swatches: ["#7C3AED", "#06B6D4", "#FFFFFF"],
    dark: D.dark("#7C3AED", "#06B6D4", "#A78BFA", "#F8FAFC", "#FFFFFF", "#F1F5F9"),
    light: D.light("#7C3AED", "#06B6D4", "#A78BFA", "#FFFFFF", "#FAFAFA", "#F4F4F5"),
  }),
  makeTheme({
    id: "com.creatos.creator-gold", slug: "creator-gold", name: "Creator Gold",
    description: "Luxury-meets-creator: deep black with rich gold accents for premium personal brands.",
    category: "creator", tags: ["gold", "luxury", "dark", "premium"],
    featured: true, industries: ["creator", "luxury & lifestyle"],
    releaseDate: "2025-02-01", updatedAt: "2025-06-12", swatches: ["#D4AF37", "#F5D06F", "#0A0A0A"],
    dark: D.dark("#D4AF37", "#F5D06F", "#8B5CF6", "#0A0A0A", "#141414", "#1F1F1F"),
  }),
  makeTheme({
    id: "com.creatos.creator-neon", slug: "creator-neon", name: "Creator Neon",
    description: "Bold black with neon green and cyan — high energy for gaming, tech and hype creators.",
    category: "creator", tags: ["neon", "green", "cyan", "dark", "energetic"],
    releaseDate: "2025-02-14", updatedAt: "2025-06-20", swatches: ["#00FF88", "#00CCFF", "#0A0A0A"],
    dark: D.dark("#00FF88", "#00CCFF", "#39FF14", "#0A0A0A", "#101010", "#1A1A1A"),
  }),
  makeTheme({
    id: "com.creatos.creator-midnight", slug: "creator-midnight", name: "Creator Midnight",
    description: "Deep midnight navy with warm amber accents — cinematic and sophisticated.",
    category: "creator", tags: ["midnight", "navy", "amber", "dark"],
    releaseDate: "2025-03-01", updatedAt: "2025-06-25", swatches: ["#0F172A", "#F59E0B", "#38BDF8"],
    dark: D.dark("#F59E0B", "#38BDF8", "#FB7185", "#0F172A", "#1E293B", "#334155"),
  }),
  makeTheme({
    id: "com.creatos.creator-glass", slug: "creator-glass", name: "Creator Glass",
    description: "Frosted glass aesthetic over deep teal — translucent cards, soft glows and a modern blur feel.",
    category: "creator", tags: ["glass", "teal", "modern", "dark"],
    releaseDate: "2025-03-10", updatedAt: "2025-06-28", swatches: ["#14B8A6", "#2DD4BF", "#0F172A"],
    dark: D.dark("#14B8A6", "#2DD4BF", "#818CF8", "#0B1220", "#152033", "#1E2B42"),
  }),
  makeTheme({
    id: "com.creatos.gaming-neon", slug: "gaming-neon", name: "Gaming Neon",
    description: "Hot pink and cyan on black — arcade energy for gaming and esports brands.",
    category: "gaming", tags: ["neon", "pink", "cyan", "gaming", "dark"],
    releaseDate: "2025-02-20", updatedAt: "2025-07-01", swatches: ["#FF2D78", "#00E5FF", "#0A0A0A"],
    dark: D.dark("#FF2D78", "#00E5FF", "#B026FF", "#0A0A0A", "#121212", "#1C1C1C"),
  }),
  makeTheme({
    id: "com.creatos.gaming-cyber", slug: "gaming-cyber", name: "Gaming Cyber",
    description: "Cyberpunk green and purple on near-black — futuristic and intense.",
    category: "gaming", tags: ["cyberpunk", "green", "purple", "gaming"],
    releaseDate: "2025-03-05", updatedAt: "2025-07-05", swatches: ["#00FF9F", "#B026FF", "#0D0D12"],
    dark: D.dark("#00FF9F", "#B026FF", "#00D4FF", "#0D0D12", "#16161E", "#20202A"),
  }),
  makeTheme({
    id: "com.creatos.gaming-matrix", slug: "gaming-matrix", name: "Gaming Matrix",
    description: "Classic matrix green on pure black — retro-digital for tech and simulation creators.",
    category: "gaming", tags: ["matrix", "green", "retro", "dark"],
    releaseDate: "2025-03-20", updatedAt: "2025-07-08", swatches: ["#00FF41", "#39FF14", "#000000"],
    dark: D.dark("#00FF41", "#39FF14", "#00FFCC", "#000000", "#0A0F0A", "#122012"),
  }),
  makeTheme({
    id: "com.creatos.streaming-purple", slug: "streaming-purple", name: "Streaming Purple",
    description: "Streamer-first dark theme with punchy purple and pink — made for live channels.",
    category: "gaming", tags: ["streaming", "purple", "pink", "dark"],
    featured: true, industries: ["gaming", "creator"],
    releaseDate: "2025-04-01", updatedAt: "2025-07-10", swatches: ["#8B5CF6", "#EC4899", "#0B0B1A"],
    dark: D.dark("#8B5CF6", "#EC4899", "#22D3EE", "#0B0B1A", "#151530", "#20204A"),
  }),
  makeTheme({
    id: "com.creatos.streaming-green", slug: "streaming-green", name: "Streaming Green",
    description: "Streamer neon green on charcoal — high contrast for overlays and live pages.",
    category: "gaming", tags: ["streaming", "green", "charcoal", "dark"],
    releaseDate: "2025-04-12", updatedAt: "2025-07-12", swatches: ["#22C55E", "#4ADE80", "#18181B"],
    dark: D.dark("#22C55E", "#4ADE80", "#00E5FF", "#18181B", "#202024", "#2A2A30"),
  }),
  makeTheme({
    id: "com.creatos.business-minimal", slug: "business-minimal", name: "Business Minimal",
    description: "White, airy and typographic — the quiet authority theme for consultants and studios.",
    category: "business & agency", tags: ["minimal", "white", "light", "business"],
    releaseDate: "2025-01-18", updatedAt: "2025-07-15", swatches: ["#111827", "#6366F1", "#FFFFFF"],
    dark: D.dark("#6366F1", "#818CF8", "#34D399", "#F9FAFB", "#FFFFFF", "#F3F4F6"),
    light: D.light("#111827", "#6366F1", "#10B981", "#FFFFFF", "#FAFAFA", "#F4F4F5"),
  }),
  makeTheme({
    id: "com.creatos.corporate-modern", slug: "corporate-modern", name: "Corporate Blue",
    description: "Trustworthy blue with crisp white surfaces — built for agencies and B2B.",
    category: "business & agency", tags: ["blue", "light", "corporate", "business"],
    industries: ["business & agency"],
    releaseDate: "2025-02-05", updatedAt: "2025-07-18", swatches: ["#2563EB", "#3B82F6", "#F8FAFC"],
    dark: D.dark("#3B82F6", "#60A5FA", "#22D3EE", "#F8FAFC", "#FFFFFF", "#F1F5F9"),
    light: D.light("#2563EB", "#3B82F6", "#06B6D4", "#FFFFFF", "#FAFAFA", "#F1F5F9"),
  }),
  makeTheme({
    id: "com.creatos.corporate-black", slug: "corporate-black", name: "Corporate Black",
    description: "Black and electric blue — a confident premium look for modern agencies.",
    category: "business & agency", tags: ["black", "blue", "dark", "corporate"],
    featured: true, industries: ["business & agency"],
    releaseDate: "2025-02-18", updatedAt: "2025-07-20", swatches: ["#3B82F6", "#60A5FA", "#000000"],
    dark: D.dark("#3B82F6", "#60A5FA", "#818CF8", "#000000", "#0D0D0D", "#161616"),
  }),
  makeTheme({
    id: "com.creatos.photography-light", slug: "photography-light", name: "Photography Light",
    description: "Gallery-white with editorial serif — lets photography breathe.",
    category: "photography", tags: ["photography", "light", "editorial", "minimal"],
    industries: ["photography"],
    releaseDate: "2025-03-08", updatedAt: "2025-07-22", swatches: ["#111827", "#9CA3AF", "#FFFFFF"],
    dark: D.dark("#111827", "#9CA3AF", "#6B7280", "#FAFAFA", "#FFFFFF", "#F3F4F6"),
    light: D.light("#111827", "#4B5563", "#9CA3AF", "#FFFFFF", "#FCFCFC", "#F5F5F5"),
  }),
  makeTheme({
    id: "com.creatos.music-festival", slug: "music-festival", name: "Music Festival",
    description: "Multicolor gradient energy for artists, festivals and event promoters.",
    category: "music", tags: ["music", "festival", "multicolor", "dark"],
    industries: ["music"],
    releaseDate: "2025-04-05", updatedAt: "2025-07-25", swatches: ["#F43F5E", "#8B5CF6", "#22D3EE"],
    dark: D.dark("#F43F5E", "#8B5CF6", "#22D3EE", "#0B0B12", "#14141E", "#1E1E2A"),
  }),
  makeTheme({
    id: "com.creatos.music-stage", slug: "music-stage", name: "Music Stage",
    description: "Deep stage-red with gold highlights — spotlight-ready for performers.",
    category: "music", tags: ["music", "stage", "red", "gold", "dark"],
    releaseDate: "2025-04-18", updatedAt: "2025-07-28", swatches: ["#DC2626", "#D4AF37", "#0A0A0A"],
    dark: D.dark("#DC2626", "#D4AF37", "#F87171", "#0A0A0A", "#131313", "#1D1D1D"),
  }),
  makeTheme({
    id: "com.creatos.fitness-energy", slug: "fitness-energy", name: "Fitness Energy",
    description: "High-octane orange and black for trainers, gyms and performance brands.",
    category: "health", tags: ["fitness", "orange", "dark", "energetic"],
    industries: ["health"],
    releaseDate: "2025-05-01", updatedAt: "2025-07-30", swatches: ["#F97316", "#FB923C", "#0A0A0A"],
    dark: D.dark("#F97316", "#FB923C", "#FACC15", "#0A0A0A", "#121212", "#1B1B1B"),
  }),
  makeTheme({
    id: "com.creatos.education-academy", slug: "education-academy", name: "Education Academy",
    description: "Light navy-and-blue academy theme for courses, schools and mentors.",
    category: "coach & education", tags: ["education", "blue", "navy", "light", "academy"],
    industries: ["coach & education"],
    releaseDate: "2025-05-12", updatedAt: "2025-08-01", swatches: ["#1E3A8A", "#3B82F6", "#F8FAFC"],
    dark: D.dark("#3B82F6", "#60A5FA", "#22D3EE", "#F1F5F9", "#FFFFFF", "#E2E8F0"),
    light: D.light("#1E3A8A", "#3B82F6", "#06B6D4", "#FFFFFF", "#F8FAFC", "#F1F5F9"),
  }),
  makeTheme({
    id: "com.creatos.luxury-champagne", slug: "luxury-champagne", name: "Luxury Gold",
    description: "Obsidian black and champagne gold for luxury goods, fashion and high-end services.",
    category: "luxury & lifestyle", tags: ["luxury", "gold", "black", "premium"],
    featured: true, industries: ["luxury & lifestyle"],
    releaseDate: "2025-05-20", updatedAt: "2025-08-03", swatches: ["#C9A227", "#F5E1A4", "#0A0A0A"],
    dark: D.dark("#C9A227", "#F5E1A4", "#A3A3A3", "#0A0A0A", "#121212", "#1C1C1C"),
  }),
];

export const CATALOG_THEMES: ReturnType<typeof createTheme>[] = catalogThemes;
