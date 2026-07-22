export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  config: Record<string, string>;
}

const BUILTIN_PRESETS: ThemePreset[] = [
  {
    id: "neon-dark",
    name: "Neon Dark",
    description: "Bold neon accents on deep dark background",
    colors: { primary: "#2D1B69", secondary: "#00f5ff", accent: "#ff00e5", background: "#09090b", text: "#ffffff" },
    fonts: { heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" },
    config: { borderRadius: "8px", layoutDensity: "comfortable" },
  },
  {
    id: "midnight-ocean",
    name: "Midnight Ocean",
    description: "Deep blues with teal and amber accents",
    colors: { primary: "#1e3a5f", secondary: "#0ea5e9", accent: "#f59e0b", background: "#0f172a", text: "#f1f5f9" },
    fonts: { heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" },
    config: { borderRadius: "12px", layoutDensity: "comfortable" },
  },
  {
    id: "forest-canopy",
    name: "Forest Canopy",
    description: "Earthy greens with warm natural tones",
    colors: { primary: "#166534", secondary: "#22c55e", accent: "#d97706", background: "#052e16", text: "#f0fdf4" },
    fonts: { heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" },
    config: { borderRadius: "8px", layoutDensity: "spacious" },
  },
  {
    id: "royal-plum",
    name: "Royal Plum",
    description: "Rich purples with gold and rose accents",
    colors: { primary: "#4c1d95", secondary: "#a855f7", accent: "#f43f5e", background: "#1a0a2e", text: "#faf5ff" },
    fonts: { heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" },
    config: { borderRadius: "16px", layoutDensity: "comfortable" },
  },
  {
    id: "slate-minimal",
    name: "Slate Minimal",
    description: "Clean monochrome with subtle blue accent",
    colors: { primary: "#334155", secondary: "#64748b", accent: "#3b82f6", background: "#0f172a", text: "#f8fafc" },
    fonts: { heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" },
    config: { borderRadius: "4px", layoutDensity: "compact" },
  },
  {
    id: "warm-ember",
    name: "Warm Ember",
    description: "Warm oranges and deep reds on dark",
    colors: { primary: "#7c2d12", secondary: "#ea580c", accent: "#facc15", background: "#1c0f0a", text: "#fff7ed" },
    fonts: { heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" },
    config: { borderRadius: "10px", layoutDensity: "comfortable" },
  },
];

export class ThemePresetRegistry {
  getAll(): ThemePreset[] {
    return BUILTIN_PRESETS;
  }

  getById(id: string): ThemePreset | undefined {
    return BUILTIN_PRESETS.find((t) => t.id === id);
  }

  getDefault(): ThemePreset {
    return BUILTIN_PRESETS[0];
  }
}

export const themePresetRegistry = new ThemePresetRegistry();
