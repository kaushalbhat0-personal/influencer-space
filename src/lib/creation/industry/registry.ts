export interface IndustryDefinition {
  id: string;
  slug: string;
  displayName: string;
  icon: string;
  description: string;
  recommendedBlueprints: string[];
  recommendedThemes: string[];
  recommendedModules: string[];
  keywords: string[];
  requiredCapability?: string;
}

const INDUSTRIES: IndustryDefinition[] = [
  {
    id: "creator", slug: "creator", displayName: "Content Creator", icon: "Sparkles",
    description: "YouTubers, streamers, and digital creators",
    recommendedBlueprints: ["com.creatos.creator", "com.creatos.gaming"],
    recommendedThemes: ["com.creatos.neon-dark", "com.creatos.warm-ember"],
    recommendedModules: ["hero", "about", "products", "gallery", "links"],
    keywords: ["youtube", "twitch", "tiktok", "influencer", "streamer", "gaming"],
  },
  {
    id: "photography", slug: "photography", displayName: "Photographer", icon: "Camera",
    description: "Photographers and visual artists",
    recommendedBlueprints: ["com.creatos.portfolio"],
    recommendedThemes: ["com.creatos.minimal-light", "com.creatos.slate-minimal", "com.creatos.midnight-ocean"],
    recommendedModules: ["hero", "about", "gallery", "testimonials"],
    keywords: ["photography", "photo", "portrait", "wedding", "nature"],
  },
  {
    id: "business", slug: "business", displayName: "Business", icon: "Building2",
    description: "Small businesses, consultants, and professionals",
    recommendedBlueprints: ["com.creatos.business"],
    recommendedThemes: ["com.creatos.slate-minimal", "com.creatos.minimal-light"],
    recommendedModules: ["hero", "about", "products", "testimonials", "faq"],
    keywords: ["business", "consulting", "professional", "service", "corporate"],
  },
  {
    id: "gaming", slug: "gaming", displayName: "Gamer", icon: "Gamepad2",
    description: "Gamers, esports players, and gaming communities",
    recommendedBlueprints: ["com.creatos.gaming", "com.creatos.creator"],
    recommendedThemes: ["com.creatos.neon-dark", "com.creatos.warm-ember"],
    recommendedModules: ["hero", "about", "games", "products", "links"],
    keywords: ["gaming", "esports", "valorant", "fortnite", "minecraft", "stream"],
  },
  {
    id: "agency", slug: "agency", displayName: "Agency", icon: "Briefcase",
    description: "Creative agencies, studios, and marketing firms",
    recommendedBlueprints: ["com.creatos.agency"],
    recommendedThemes: ["com.creatos.slate-minimal", "com.creatos.minimal-light", "com.creatos.midnight-ocean"],
    recommendedModules: ["hero", "about", "gallery", "products", "testimonials", "faq"],
    keywords: ["agency", "studio", "creative", "marketing", "design"],
    requiredCapability: "agency_clients",
  },
  {
    id: "podcast", slug: "podcast", displayName: "Podcaster", icon: "Mic",
    description: "Podcasters and audio content creators",
    recommendedBlueprints: ["com.creatos.podcast"],
    recommendedThemes: ["com.creatos.neon-dark", "com.creatos.midnight-ocean", "com.creatos.minimal-light"],
    recommendedModules: ["hero", "about", "timeline", "products", "links"],
    keywords: ["podcast", "audio", "radio", "interview", "show"],
  },
  {
    id: "portfolio", slug: "portfolio", displayName: "Creative Professional", icon: "Palette",
    description: "Designers, artists, and creative professionals",
    recommendedBlueprints: ["com.creatos.portfolio"],
    recommendedThemes: ["com.creatos.minimal-light", "com.creatos.midnight-ocean"],
    recommendedModules: ["hero", "about", "gallery", "testimonials", "contact"],
    keywords: ["design", "art", "illustration", "creative", "portfolio"],
  },
  {
    id: "coach", slug: "coach", displayName: "Coach", icon: "Target",
    description: "Life coaches, fitness trainers, and mentors",
    recommendedBlueprints: ["com.creatos.business", "com.creatos.creator"],
    recommendedThemes: ["com.creatos.minimal-light", "com.creatos.slate-minimal", "com.creatos.warm-ember"],
    recommendedModules: ["hero", "about", "products", "testimonials", "faq"],
    keywords: ["coach", "mentor", "fitness", "life coach", "training"],
  },
];

export class IndustryRegistry {
  getAll(): IndustryDefinition[] { return INDUSTRIES.map((i) => ({ ...i })); }
  getById(id: string): IndustryDefinition | undefined { return INDUSTRIES.find((i) => i.id === id); }

  getByCapabilities(capabilities: string[]): IndustryDefinition[] {
    return INDUSTRIES.filter((i) => !i.requiredCapability || capabilities.includes(i.requiredCapability));
  }

  search(query: string): IndustryDefinition[] {
    const q = query.toLowerCase();
    return INDUSTRIES.filter((i) =>
      i.displayName.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }

  getRecommendedBlueprintIds(industryId: string): string[] {
    return this.getById(industryId)?.recommendedBlueprints ?? [];
  }

  getRecommendedThemeIds(industryId: string): string[] {
    return this.getById(industryId)?.recommendedThemes ?? [];
  }
}

export const industryRegistry = new IndustryRegistry();
