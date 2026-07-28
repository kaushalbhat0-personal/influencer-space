export interface StyleDefinition {
  id: string;
  slug: string;
  displayName: string;
  icon: string;
  description: string;
  compatibleThemeIds: string[];
  keywords: string[];
}

const STYLES: StyleDefinition[] = [
  {
    id: "minimal", slug: "minimal", displayName: "Minimal", icon: "Circle",
    description: "Clean, minimal design with plenty of white space",
    compatibleThemeIds: ["com.creatos.minimal-light", "com.creatos.slate-minimal"],
    keywords: ["clean", "simple", "white", "modern", "minimalist"],
  },
  {
    id: "dark", slug: "dark", displayName: "Dark", icon: "Moon",
    description: "Dark backgrounds with vibrant accent colors",
    compatibleThemeIds: ["com.creatos.neon-dark", "com.creatos.midnight-ocean", "com.creatos.warm-ember"],
    keywords: ["dark", "night", "bold", "dramatic"],
  },
  {
    id: "professional", slug: "professional", displayName: "Professional", icon: "Briefcase",
    description: "Polished, trustworthy design for businesses",
    compatibleThemeIds: ["com.creatos.slate-minimal", "com.creatos.minimal-light", "com.creatos.midnight-ocean"],
    keywords: ["professional", "corporate", "trustworthy", "clean"],
  },
  {
    id: "bold", slug: "bold", displayName: "Bold", icon: "Zap",
    description: "High-contrast design with strong visual impact",
    compatibleThemeIds: ["com.creatos.neon-dark", "com.creatos.warm-ember"],
    keywords: ["bold", "loud", "colorful", "energetic"],
  },
  {
    id: "elegant", slug: "elegant", displayName: "Elegant", icon: "Gem",
    description: "Sophisticated design with premium feel",
    compatibleThemeIds: ["com.creatos.minimal-light", "com.creatos.midnight-ocean"],
    keywords: ["elegant", "luxury", "premium", "sophisticated"],
  },
  {
    id: "playful", slug: "playful", displayName: "Playful", icon: "Smile",
    description: "Fun, energetic design for creative personalities",
    compatibleThemeIds: ["com.creatos.warm-ember", "com.creatos.neon-dark"],
    keywords: ["fun", "playful", "colorful", "energetic", "creative"],
  },
];

export class StyleRegistry {
  getAll(): StyleDefinition[] { return STYLES.map((s) => ({ ...s })); }
  getById(id: string): StyleDefinition | undefined { return STYLES.find((s) => s.id === id); }

  getCompatibleThemeIds(styleId: string): string[] {
    return this.getById(styleId)?.compatibleThemeIds ?? [];
  }

  search(query: string): StyleDefinition[] {
    const q = query.toLowerCase();
    return STYLES.filter((s) =>
      s.displayName.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }
}

export const styleRegistry = new StyleRegistry();
