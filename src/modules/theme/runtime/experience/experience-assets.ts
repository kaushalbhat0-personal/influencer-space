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
