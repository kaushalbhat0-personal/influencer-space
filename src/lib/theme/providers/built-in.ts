import type { ThemeDefinition } from "../types-new";
import { DEFAULT_LIGHT_TOKENS, DEFAULT_DARK_TOKENS, freezeTokens } from "../tokens-new";

const NEON_DARK: ThemeDefinition = {
  id: "com.creatos.neon-dark",
  slug: "neon-dark",
  name: "Neon Dark",
  description: "Bold neon accents on deep dark background",
  author: { name: "CreatorOS" },
  version: "2.0.0",
  tokenVersion: 1,
  category: "creator",
  tags: ["dark", "neon", "bold", "gaming"],
  premium: false,
  status: "active",
  supportsDarkMode: false,
  supportsRTL: false,
  variants: [{
    mode: "dark",
    tokens: freezeTokens({
      ...DEFAULT_DARK_TOKENS,
      colors: { ...DEFAULT_DARK_TOKENS.colors, primary: "#2D1B69", secondary: "#00f5ff", accent: "#ff00e5" },
    }),
  }],
};

const MINIMAL_LIGHT: ThemeDefinition = {
  id: "com.creatos.minimal-light",
  slug: "minimal-light",
  name: "Minimal Light",
  description: "Clean, minimal light theme",
  author: { name: "CreatorOS" },
  version: "1.0.0",
  tokenVersion: 1,
  category: "minimal",
  tags: ["light", "clean", "minimal", "professional"],
  premium: false,
  status: "active",
  supportsDarkMode: true,
  supportsRTL: false,
  variants: [
    {
      mode: "light",
      tokens: freezeTokens({
        ...DEFAULT_LIGHT_TOKENS,
        colors: { ...DEFAULT_LIGHT_TOKENS.colors, primary: "#1E293B", secondary: "#475569", accent: "#3B82F6" },
      }),
    },
    {
      mode: "dark",
      tokens: freezeTokens({
        ...DEFAULT_DARK_TOKENS,
        colors: { ...DEFAULT_DARK_TOKENS.colors, primary: "#E2E8F0", secondary: "#94A3B8", accent: "#60A5FA" },
      }),
    },
  ],
};

const MIDNIGHT_OCEAN: ThemeDefinition = {
  id: "com.creatos.midnight-ocean",
  slug: "midnight-ocean",
  name: "Midnight Ocean",
  description: "Deep blues with teal and amber accents",
  author: { name: "CreatorOS" },
  version: "1.0.0",
  tokenVersion: 1,
  category: "portfolio",
  tags: ["dark", "blue", "teal", "professional"],
  premium: false,
  status: "active",
  supportsDarkMode: false,
  supportsRTL: false,
  variants: [{
    mode: "dark",
    tokens: freezeTokens({
      ...DEFAULT_DARK_TOKENS,
      colors: { ...DEFAULT_DARK_TOKENS.colors, primary: "#1e3a5f", secondary: "#0ea5e9", accent: "#f59e0b", background: "#0f172a", surface: "#1e293b" },
    }),
  }],
};

const WARM_EMBER: ThemeDefinition = {
  id: "com.creatos.warm-ember",
  slug: "warm-ember",
  name: "Warm Ember",
  description: "Warm oranges and deep reds",
  author: { name: "CreatorOS" },
  version: "1.0.0",
  tokenVersion: 1,
  category: "creator",
  tags: ["warm", "orange", "red", "dark", "cozy"],
  premium: true,
  status: "active",
  supportsDarkMode: false,
  supportsRTL: false,
  variants: [{
    mode: "dark",
    tokens: freezeTokens({
      ...DEFAULT_DARK_TOKENS,
      colors: { ...DEFAULT_DARK_TOKENS.colors, primary: "#7c2d12", secondary: "#ea580c", accent: "#facc15", background: "#1c0f0a", surface: "#2d1a12" },
    }),
  }],
};

const BUILT_IN_THEMES: ThemeDefinition[] = [NEON_DARK, MINIMAL_LIGHT, MIDNIGHT_OCEAN, WARM_EMBER];

export class BuiltInThemeProvider {
  readonly type = "built-in";

  getAll(): ThemeDefinition[] { return BUILT_IN_THEMES.map((t) => ({ ...t })); }
  getById(id: string): ThemeDefinition | undefined { return BUILT_IN_THEMES.find((t) => t.id === id); }

  list(options?: { category?: string; premium?: boolean; search?: string }): ThemeDefinition[] {
    let results = [...BUILT_IN_THEMES];
    if (options?.category) results = results.filter((t) => t.category === options.category);
    if (options?.premium !== undefined) results = results.filter((t) => t.premium === options.premium);
    if (options?.search) {
      const q = options.search.toLowerCase();
      results = results.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q)));
    }
    return results;
  }
}

export const builtInThemeProvider = new BuiltInThemeProvider();
