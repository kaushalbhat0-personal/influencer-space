/**
 * Category Decoration Packs (IMPLEMENTATION-45) — SVG-only, vector decoration
 * configuration per creator niche. Each pack is a list of decoration elements
 * rendered at low opacity (2–6%) by the DecorationLayer. Never contains text;
 * always aria-hidden + pointer-events-none.
 */
import type { ExperienceDecorationPack } from "./theme-experience";

export type CategoryKey =
  | "fitness" | "gaming" | "finance" | "technology" | "education" | "music"
  | "photography" | "travel" | "food" | "fashion" | "podcast" | "creator"
  | "health" | "business & agency" | "coach & education" | "luxury & lifestyle";

/** Decoration element kinds rendered by DecorationLayer (SVG shapes). */
export type DecorationElement =
  | "orb" | "ring" | "star" | "dot" | "hex" | "wave" | "grid" | "diagonal" | "orbit" | "sparkle";

export interface DecorationPack {
  key: CategoryKey;
  label: string;
  /** Config-driven list of SVG elements + placement. */
  elements: Array<{ kind: DecorationElement; x: string; y: string; size: number }>;
}

export const CATEGORY_DECORATION: Record<CategoryKey, ExperienceDecorationPack> = {
  fitness: "rings",
  gaming: "hexagons",
  finance: "grid",
  technology: "hexagons",
  education: "dots",
  music: "waves",
  photography: "rings",
  travel: "constellation",
  food: "waves",
  fashion: "glow",
  podcast: "waves",
  creator: "creator",
  health: "rings",
  "business & agency": "grid",
  "coach & education": "dots",
  "luxury & lifestyle": "glow",
};

export const DECORATION_PACKS: Record<ExperienceDecorationPack, DecorationPack> = {
  minimal: { key: "creator", label: "Minimal", elements: [] },
  constellation: {
    key: "creator", label: "Constellation",
    elements: [
      { kind: "star", x: "8%", y: "18%", size: 4 },
      { kind: "star", x: "14%", y: "62%", size: 3 },
      { kind: "star", x: "82%", y: "24%", size: 4 },
      { kind: "star", x: "90%", y: "70%", size: 3 },
      { kind: "orbit", x: "70%", y: "30%", size: 180 },
      { kind: "orbit", x: "20%", y: "70%", size: 220 },
    ],
  },
  grid: {
    key: "creator", label: "Grid",
    elements: [{ kind: "grid", x: "0%", y: "0%", size: 420 }],
  },
  dots: {
    key: "creator", label: "Dots",
    elements: [
      { kind: "dot", x: "6%", y: "20%", size: 3 },
      { kind: "dot", x: "12%", y: "48%", size: 3 },
      { kind: "dot", x: "88%", y: "30%", size: 3 },
      { kind: "dot", x: "82%", y: "66%", size: 3 },
      { kind: "dot", x: "94%", y: "12%", size: 3 },
    ],
  },
  rings: {
    key: "creator", label: "Rings",
    elements: [
      { kind: "ring", x: "12%", y: "24%", size: 140 },
      { kind: "ring", x: "84%", y: "60%", size: 180 },
      { kind: "ring", x: "70%", y: "16%", size: 90 },
    ],
  },
  waves: {
    key: "creator", label: "Waves",
    elements: [{ kind: "wave", x: "0%", y: "70%", size: 520 }],
  },
  hexagons: {
    key: "creator", label: "Hexagons",
    elements: [
      { kind: "hex", x: "10%", y: "30%", size: 46 },
      { kind: "hex", x: "86%", y: "48%", size: 60 },
      { kind: "hex", x: "74%", y: "18%", size: 34 },
    ],
  },
  blobs: {
    key: "creator", label: "Blobs",
    elements: [
      { kind: "orb", x: "-4%", y: "-6%", size: 300 },
      { kind: "orb", x: "84%", y: "60%", size: 260 },
    ],
  },
  glow: {
    key: "creator", label: "Glow",
    elements: [
      { kind: "orb", x: "50%", y: "8%", size: 380 },
      { kind: "ring", x: "50%", y: "50%", size: 320 },
    ],
  },
  orbits: {
    key: "creator", label: "Orbits",
    elements: [
      { kind: "orbit", x: "50%", y: "40%", size: 260 },
      { kind: "orbit", x: "50%", y: "40%", size: 180 },
      { kind: "star", x: "50%", y: "20%", size: 4 },
      { kind: "star", x: "74%", y: "52%", size: 3 },
    ],
  },
  particles: {
    key: "creator", label: "Particles",
    elements: [
      { kind: "dot", x: "10%", y: "30%", size: 3 },
      { kind: "dot", x: "30%", y: "70%", size: 2 },
      { kind: "dot", x: "60%", y: "24%", size: 3 },
      { kind: "dot", x: "80%", y: "60%", size: 2 },
      { kind: "star", x: "44%", y: "48%", size: 3 },
      { kind: "star", x: "68%", y: "34%", size: 2 },
    ],
  },
  // Category packs resolve to the base element packs above via
  // CATEGORY_DECORATION — these aliases keep DECORATION_PACKS total.
  fitness: { key: "fitness", label: "Fitness", elements: [{ kind: "ring", x: "12%", y: "24%", size: 140 }, { kind: "dot", x: "86%", y: "66%", size: 3 }] },
  gaming: { key: "gaming", label: "Gaming", elements: [{ kind: "hex", x: "10%", y: "30%", size: 46 }, { kind: "hex", x: "86%", y: "48%", size: 60 }] },
  finance: { key: "finance", label: "Finance", elements: [{ kind: "grid", x: "0%", y: "0%", size: 420 }] },
  technology: { key: "technology", label: "Technology", elements: [{ kind: "hex", x: "12%", y: "26%", size: 40 }, { kind: "hex", x: "82%", y: "60%", size: 54 }] },
  education: { key: "education", label: "Education", elements: [{ kind: "dot", x: "8%", y: "30%", size: 3 }, { kind: "dot", x: "90%", y: "60%", size: 3 }] },
  music: { key: "music", label: "Music", elements: [{ kind: "wave", x: "0%", y: "66%", size: 480 }] },
  photography: { key: "photography", label: "Photography", elements: [{ kind: "ring", x: "80%", y: "24%", size: 160 }] },
  travel: { key: "travel", label: "Travel", elements: [{ kind: "star", x: "16%", y: "24%", size: 4 }, { kind: "star", x: "82%", y: "66%", size: 3 }] },
  food: { key: "food", label: "Food", elements: [{ kind: "wave", x: "0%", y: "72%", size: 420 }] },
  fashion: { key: "fashion", label: "Fashion", elements: [{ kind: "orb", x: "50%", y: "12%", size: 320 }] },
  podcast: { key: "podcast", label: "Podcast", elements: [{ kind: "wave", x: "0%", y: "60%", size: 460 }] },
  creator: {
    key: "creator", label: "Creator",
    elements: [
      { kind: "sparkle", x: "12%", y: "22%", size: 10 },
      { kind: "sparkle", x: "86%", y: "30%", size: 12 },
      { kind: "sparkle", x: "74%", y: "70%", size: 8 },
      { kind: "orbit", x: "50%", y: "20%", size: 240 },
      { kind: "star", x: "30%", y: "70%", size: 3 },
    ],
  },
};

/** Resolve a pack for an experience decoration key (with fallback). */
export function getDecorationPack(key: ExperienceDecorationPack | undefined): DecorationPack {
  if (key && DECORATION_PACKS[key]) return DECORATION_PACKS[key];
  return DECORATION_PACKS.minimal;
}
