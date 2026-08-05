/**
 * Experience Assets (IMPLEMENTATION-45) — reusable, SVG-only visual assets.
 * Low-opacity decorative SVGs rendered inline (no raster). Never contain text.
 */

export interface PatternAsset {
  id: string;
  body: string;
}

export const BACKGROUND_ASSETS: Record<string, PatternAsset> = {
  grid: {
    id: "xp-grid",
    body: `<pattern id="xp-grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="currentColor" stroke-width="0.5"/></pattern><rect width="100%" height="100%" fill="url(#xp-grid)"/>`,
  },
  dots: {
    id: "xp-dots",
    body: `<pattern id="xp-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="currentColor"/></pattern><rect width="100%" height="100%" fill="url(#xp-dots)"/>`,
  },
  noise: {
    id: "xp-noise",
    body: `<filter id="xp-noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#xp-noise)" opacity="0.5"/>`,
  },
  lines: {
    id: "xp-lines",
    body: `<pattern id="xp-lines" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M0 60L60 0L120 60L60 120Z" fill="none" stroke="currentColor" stroke-width="0.4"/></pattern><rect width="100%" height="100%" fill="url(#xp-lines)"/>`,
  },
};

/** Decoration element renderers (SVG shapes, 2–6% opacity via parent). */
export function renderDecorationElement(kind: string, size: number, key: string): string {
  switch (kind) {
    case "orb":
      return `<circle key="${key}" cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#xp-orb-${key})"/>`;
    case "ring":
      return `<circle key="${key}" cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="none" stroke="currentColor" stroke-width="1"/>`;
    case "star":
      return `<path key="${key}" d="M${size / 2} 0 L${(size * 0.62) / 2} ${(size * 0.62) / 2} L${size} ${size / 2} L${(size * 0.62) / 2} ${(size * 0.62) / 2} L${size / 2} ${size} L${(size * 0.38) / 2} ${(size * 0.62) / 2} L0 ${size / 2} L${(size * 0.38) / 2} ${(size * 0.62) / 2} Z" fill="currentColor"/>`;
    case "dot":
      return `<circle key="${key}" cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="currentColor"/>`;
    case "hex":
      return `<polygon key="${key}" points="${size / 2},0 ${size},${(size * 0.25)} ${size},${(size * 0.75)} ${size / 2},${size} 0,${(size * 0.75)} 0,${(size * 0.25)}" fill="none" stroke="currentColor" stroke-width="1"/>`;
    case "orbit":
      return `<circle key="${key}" cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="none" stroke="currentColor" stroke-width="0.5" stroke-dasharray="3 5"/>`;
    case "sparkle":
      return `<path key="${key}" d="M${size / 2} ${size * 0.1}l${size * 0.18} ${size * 0.34} ${size * 0.34} ${size * 0.06} -${size * 0.26} ${size * 0.22} ${size * 0.08} ${size * 0.34} -${size * 0.28} -${size * 0.2} -${size * 0.28} ${size * 0.2} ${size * 0.08} -${size * 0.34} -${size * 0.26} -${size * 0.22} ${size * 0.34} -${size * 0.06}Z" fill="currentColor"/>`;
    default:
      return "";
  }
}

/**
 * Reusable SVG illustration packs (IMPLEMENTATION-48.2).
 * Each pack provides themed decorative illustrations at 2–5% opacity.
 * Rendered as background decorations — never interactive.
 */
export interface IllustrationPack {
  id: string;
  elements: Array<{ kind: string; x: string; y: string; size: number }>;
}

export const ILLUSTRATION_PACKS: Record<string, IllustrationPack> = {
  creator: {
    id: "creator",
    elements: [
      { kind: "play", x: "10%", y: "15%", size: 48 },
      { kind: "camera", x: "80%", y: "20%", size: 40 },
      { kind: "mic", x: "25%", y: "70%", size: 36 },
      { kind: "bag", x: "70%", y: "65%", size: 44 },
      { kind: "graph", x: "45%", y: "40%", size: 42 },
      { kind: "sparkle", x: "90%", y: "50%", size: 28 },
    ],
  },
  business: {
    id: "business",
    elements: [
      { kind: "chart", x: "15%", y: "20%", size: 50 },
      { kind: "invoice", x: "75%", y: "25%", size: 44 },
      { kind: "dashboard", x: "40%", y: "60%", size: 48 },
      { kind: "workflow", x: "85%", y: "55%", size: 40 },
    ],
  },
  education: {
    id: "education",
    elements: [
      { kind: "book", x: "12%", y: "18%", size: 46 },
      { kind: "grad", x: "78%", y: "22%", size: 40 },
      { kind: "lesson", x: "35%", y: "65%", size: 44 },
    ],
  },
  gaming: {
    id: "gaming",
    elements: [
      { kind: "controller", x: "15%", y: "18%", size: 48 },
      { kind: "lightning", x: "75%", y: "25%", size: 36 },
      { kind: "particle", x: "50%", y: "60%", size: 40 },
      { kind: "hex", x: "88%", y: "55%", size: 34 },
    ],
  },
  fitness: {
    id: "fitness",
    elements: [
      { kind: "dumbbell", x: "12%", y: "20%", size: 44 },
      { kind: "pulse", x: "72%", y: "25%", size: 38 },
      { kind: "motion", x: "40%", y: "60%", size: 46 },
    ],
  },
  travel: {
    id: "travel",
    elements: [
      { kind: "compass", x: "10%", y: "15%", size: 42 },
      { kind: "mountain", x: "78%", y: "20%", size: 48 },
      { kind: "plane", x: "50%", y: "65%", size: 40 },
      { kind: "circle", x: "90%", y: "45%", size: 32 },
    ],
  },
};

/** Renders a single illustration element as a tiny SVG (2-5% opacity). */
export function renderIllustrationElement(kind: string, size: number): string {
  const s = size;
  switch (kind) {
    case "play":
      return `<polygon points="${s * 0.2},${s * 0.1} ${s * 0.2},${s * 0.9} ${s * 0.85},${s * 0.5}" fill="currentColor"/>`;
    case "camera":
      return `<rect x="${s * 0.1}" y="${s * 0.25}" width="${s * 0.8}" height="${s * 0.55}" rx="${s * 0.1}" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.15}" fill="none" stroke="currentColor" stroke-width="1"/>`;
    case "mic":
      return `<rect x="${s * 0.35}" y="${s * 0.1}" width="${s * 0.3}" height="${s * 0.45}" rx="${s * 0.15}" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M${s * 0.25} ${s * 0.65}l${s * 0.5} 0l-${s * 0.15} ${s * 0.25}z" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
    case "bag":
      return `<path d="M${s * 0.2} ${s * 0.3}l0 ${s * 0.6}c0 ${s * 0.08} ${s * 0.06} ${s * 0.1} ${s * 0.15} ${s * 0.1}l${s * 0.3} 0c${s * 0.09} 0 ${s * 0.15} -${s * 0.02} ${s * 0.15} -${s * 0.1}l0 -${s * 0.6}" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M${s * 0.35} ${s * 0.3}l0 -${s * 0.12}c0 -${s * 0.05} ${s * 0.04} -${s * 0.08} ${s * 0.1} -${s * 0.08}l${s * 0.1} 0c${s * 0.06} 0 ${s * 0.1} ${s * 0.03} ${s * 0.1} ${s * 0.08}l0 ${s * 0.12}" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
    case "graph":
      return `<polyline points="${s * 0.1},${s * 0.75} ${s * 0.3},${s * 0.4} ${s * 0.5},${s * 0.55} ${s * 0.7},${s * 0.2} ${s * 0.9},${s * 0.35}" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="${s * 0.7}" cy="${s * 0.2}" r="${s * 0.04}" fill="currentColor"/>`;
    case "chart":
      return `<rect x="${s * 0.15}" y="${s * 0.5}" width="${s * 0.18}" height="${s * 0.4}" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="${s * 0.4}" y="${s * 0.3}" width="${s * 0.18}" height="${s * 0.6}" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="${s * 0.65}" y="${s * 0.15}" width="${s * 0.18}" height="${s * 0.75}" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
    case "invoice":
      return `<rect x="${s * 0.15}" y="${s * 0.1}" width="${s * 0.7}" height="${s * 0.8}" rx="${s * 0.06}" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="${s * 0.25}" y1="${s * 0.3}" x2="${s * 0.7}" y2="${s * 0.3}" stroke="currentColor" stroke-width="1"/><line x1="${s * 0.25}" y1="${s * 0.5}" x2="${s * 0.6}" y2="${s * 0.5}" stroke="currentColor" stroke-width="1"/><circle cx="${s * 0.65}" cy="${s * 0.7}" r="${s * 0.1}" fill="none" stroke="currentColor" stroke-width="1"/>`;
    case "dashboard":
      return `<rect x="${s * 0.1}" y="${s * 0.1}" width="${s * 0.8}" height="${s * 0.8}" rx="${s * 0.08}" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="${s * 0.2}" y="${s * 0.25}" width="${s * 0.25}" height="${s * 0.25}" rx="2" fill="none" stroke="currentColor" stroke-width="1"/><rect x="${s * 0.5}" y="${s * 0.25}" width="${s * 0.3}" height="${s * 0.15}" rx="2" fill="none" stroke="currentColor" stroke-width="1"/><polyline points="${s * 0.2},${s * 0.7} ${s * 0.4},${s * 0.55} ${s * 0.6},${s * 0.6} ${s * 0.8},${s * 0.35}" fill="none" stroke="currentColor" stroke-width="1"/>`;
    case "workflow":
      return `<rect x="${s * 0.15}" y="${s * 0.3}" width="${s * 0.2}" height="${s * 0.15}" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="${s * 0.4}" y="${s * 0.55}" width="${s * 0.2}" height="${s * 0.15}" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="${s * 0.65}" y="${s * 0.15}" width="${s * 0.2}" height="${s * 0.15}" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="${s * 0.35}" y1="${s * 0.45}" x2="${s * 0.4}" y2="${s * 0.55}" stroke="currentColor" stroke-width="1"/><line x1="${s * 0.6}" y1="${s * 0.55}" x2="${s * 0.65}" y2="${s * 0.3}" stroke="currentColor" stroke-width="1"/>`;
    case "book":
      return `<path d="M${s * 0.15} ${s * 0.1}l${s * 0.35} 0c${s * 0.02} 0 ${s * 0.03} ${s * 0.01} ${s * 0.03} ${s * 0.03}l0 ${s * 0.74}c0 ${s * 0.02} -${s * 0.01} ${s * 0.03} -${s * 0.03} ${s * 0.03}l-${s * 0.35} 0" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M${s * 0.5} ${s * 0.1}l${s * 0.35} 0c${s * 0.02} 0 ${s * 0.03} ${s * 0.01} ${s * 0.03} ${s * 0.03}l0 ${s * 0.74}c0 ${s * 0.02} -${s * 0.01} ${s * 0.03} -${s * 0.03} ${s * 0.03}l-${s * 0.35} 0" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
    case "grad":
      return `<path d="M${s * 0.3} ${s * 0.2}l${s * 0.4} 0l${s * 0.1} ${s * 0.35}l-${s * 0.6} 0z" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="${s * 0.4}" y="${s * 0.5}" width="${s * 0.2}" height="${s * 0.35}" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="${s * 0.5}" cy="${s * 0.65}" r="${s * 0.04}" fill="currentColor"/>`;
    case "lesson":
      return `<rect x="${s * 0.1}" y="${s * 0.15}" width="${s * 0.55}" height="${s * 0.5}" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="${s * 0.2}" y1="${s * 0.3}" x2="${s * 0.55}" y2="${s * 0.3}" stroke="currentColor" stroke-width="1"/><line x1="${s * 0.2}" y1="${s * 0.45}" x2="${s * 0.5}" y2="${s * 0.45}" stroke="currentColor" stroke-width="1"/><circle cx="${s * 0.75}" cy="${s * 0.55}" r="${s * 0.15}" fill="none" stroke="currentColor" stroke-width="1"/><polyline points="${s * 0.68},${s * 0.5} ${s * 0.75},${s * 0.45} ${s * 0.82},${s * 0.5}" fill="none" stroke="currentColor" stroke-width="1"/>`;
    case "controller":
      return `<path d="M${s * 0.1} ${s * 0.4}l${s * 0.2} ${s * 0.15}l${s * 0.4} 0l${s * 0.2} -${s * 0.15}l0 ${s * 0.3}l-${s * 0.2} ${s * 0.25}l-${s * 0.4} 0l-${s * 0.2} -${s * 0.25}z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="${s * 0.25}" cy="${s * 0.5}" r="${s * 0.04}" fill="currentColor"/><circle cx="${s * 0.45}" cy="${s * 0.55}" r="${s * 0.04}" fill="currentColor"/>`;
    case "lightning":
      return `<polygon points="${s * 0.45},${s * 0.05} ${s * 0.3},${s * 0.5} ${s * 0.42},${s * 0.5} ${s * 0.35},${s * 0.95} ${s * 0.55},${s * 0.4} ${s * 0.42},${s * 0.4} ${s * 0.58},${s * 0.05} " fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`;
    case "particle":
      return `<circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.15}" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.04}" fill="currentColor"/><circle cx="${s * 0.3}" cy="${s * 0.7}" r="${s * 0.03}" fill="currentColor"/><circle cx="${s * 0.75}" cy="${s * 0.3}" r="${s * 0.05}" fill="currentColor"/>`;
    case "dumbbell":
      return `<rect x="${s * 0.15}" y="${s * 0.4}" width="${s * 0.7}" height="${s * 0.08}" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="${s * 0.05}" y="${s * 0.25}" width="${s * 0.12}" height="${s * 0.38}" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="${s * 0.83}" y="${s * 0.25}" width="${s * 0.12}" height="${s * 0.38}" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
    case "pulse":
      return `<polyline points="${s * 0.05},${s * 0.5} ${s * 0.25},${s * 0.5} ${s * 0.35},${s * 0.2} ${s * 0.45},${s * 0.8} ${s * 0.55},${s * 0.5} ${s * 0.95},${s * 0.5}" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
    case "motion":
      return `<path d="M${s * 0.05} ${s * 0.5}l${s * 0.15} -${s * 0.2}l${s * 0.15} ${s * 0.2}l${s * 0.15} -${s * 0.3}l${s * 0.15} ${s * 0.3}l${s * 0.15} -${s * 0.15}l${s * 0.15} ${s * 0.15}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`;
    case "compass":
      return `<circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.4}" fill="none" stroke="currentColor" stroke-width="1.5"/><polygon points="${s * 0.5},${s * 0.15} ${s * 0.55},${s * 0.45} ${s * 0.85},${s * 0.5} ${s * 0.55},${s * 0.55} ${s * 0.5},${s * 0.85} ${s * 0.45},${s * 0.55}" fill="currentColor"/>`;
    case "mountain":
      return `<polyline points="${s * 0.05},${s * 0.85} ${s * 0.35},${s * 0.25} ${s * 0.5},${s * 0.55} ${s * 0.7},${s * 0.15} ${s * 0.95},${s * 0.85}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><polyline points="${s * 0.7},${s * 0.45} ${s * 0.75},${s * 0.35} ${s * 0.82},${s * 0.45}" fill="none" stroke="currentColor" stroke-width="0.8"/>`;
    case "plane":
      return `<path d="M${s * 0.05} ${s * 0.5}l${s * 0.3} -${s * 0.1}l${s * 0.45} -${s * 0.3}l${s * 0.15} 0l-${s * 0.3} ${s * 0.35}l-${s * 0.1} ${s * 0.15}l${s * 0.4} ${s * 0.1}l-${s * 0.35} ${s * 0.2}z" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
    case "circle":
      return `<circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.3}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 4"/>`;
    default:
      return "";
  }
}
