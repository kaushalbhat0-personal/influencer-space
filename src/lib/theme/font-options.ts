/**
 * RCCF-71.2 — shared typography option sets (fonts + heading weights).
 *
 * Single authority for the font presets a creator may pick. `theme.actions`
 * persists the chosen key through `FONT_MAP` into Website.themeFonts; the
 * Builder panel and the admin appearance page render `FONT_OPTIONS`. Heading
 * weight presets persist through Website.themeConfig.headingWeight and resolve
 * into `--brand-font-weight-heading` via the canonical snapshot → LayoutEngine
 * pipeline (renderers consume it with a 700 fallback, so old snapshots are
 * unchanged).
 */

export const FONT_OPTIONS = [
  { value: "geist", label: "Geist (Default)" },
  { value: "inter", label: "Inter" },
  { value: "plex", label: "IBM Plex" },
  { value: "mono", label: "JetBrains Mono" },
] as const;

export const FONT_MAP: Record<string, { heading: string; body: string }> = {
  geist: { heading: "Geist, system-ui, sans-serif", body: "Geist, system-ui, sans-serif" },
  inter: { heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" },
  plex: { heading: "'IBM Plex Sans', system-ui, sans-serif", body: "'IBM Plex Sans', system-ui, sans-serif" },
  mono: { heading: "'JetBrains Mono', monospace", body: "'JetBrains Mono', monospace" },
};

export const FONT_REVERSE_MAP: Record<string, string> = {
  "Geist, system-ui, sans-serif": "geist",
  "Inter, system-ui, sans-serif": "inter",
  "'IBM Plex Sans', system-ui, sans-serif": "plex",
  "'JetBrains Mono', monospace": "mono",
};

export const HEADING_WEIGHT_OPTIONS = [
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold (Default)" },
  { value: "800", label: "Extrabold" },
] as const;

export const HEADING_WEIGHT_VALUES = new Set<string>(HEADING_WEIGHT_OPTIONS.map((o) => o.value));