import type { BlueprintDefinition } from "../types";

const BASE_NAV = [
  { id: "hero", label: "Home", href: "#hero", type: "anchor" as const, order: 0, visible: true },
  { id: "about", label: "About", href: "#about", type: "anchor" as const, order: 1, visible: true },
  { id: "contact", label: "Contact", href: "#contact", type: "anchor" as const, order: 10, visible: true },
];

const CREATOR_BLUEPRINT: BlueprintDefinition = {
  id: "com.creatos.creator",
  slug: "creator",
  name: "Creator",
  description: "Perfect for content creators, streamers, and influencers",
  author: { name: "CreatorOS" },
  version: "1.0.0",
  schemaVersion: 1,
  status: "active",
  category: "creator",
  tags: ["creator", "influencer", "streamer", "youtuber", "gaming"],
  pages: [
    { id: "page-home", name: "Home", slug: "/", isHome: true, order: 0, sections: [
      { id: "sec-hero", moduleId: "hero.default", order: 0, visible: true },
      { id: "sec-about", moduleId: "about.default", order: 1, visible: true },
      { id: "sec-products", moduleId: "products.grid", order: 2, visible: true },
      { id: "sec-gallery", moduleId: "gallery.grid", order: 3, visible: true },
      { id: "sec-timeline", moduleId: "timeline.default", order: 4, visible: true },
      { id: "sec-testimonials", moduleId: "testimonials.default", order: 5, visible: true },
      { id: "sec-faq", moduleId: "faq.default", order: 6, visible: true },
      { id: "sec-links", moduleId: "links.default", order: 7, visible: true },
      { id: "sec-contact", moduleId: "contact.default", order: 8, visible: true },
      { id: "sec-footer", moduleId: "footer.default", order: 9, visible: true },
    ]},
  ],
  navigation: [
    ...BASE_NAV,
    { id: "products", label: "Products", href: "#products", type: "anchor" as const, order: 3, visible: true },
    { id: "gallery", label: "Gallery", href: "#gallery", type: "anchor" as const, order: 4, visible: true },
    { id: "testimonials", label: "Testimonials", href: "#testimonials", type: "anchor" as const, order: 6, visible: true },
    { id: "links", label: "Links", href: "#links", type: "anchor" as const, order: 8, visible: true },
  ],
  recommendedThemes: ["com.creatos.neon-dark", "com.creatos.warm-ember", "com.creatos.midnight-ocean"],
  compatibleThemes: [],
  incompatibleThemes: [],
  requiredCapabilities: [],
  featureFlags: {},
  seoDefaults: {
    titlePattern: "{name} — Creator Storefront",
    descriptionPattern: "{tagline}",
    schemaTypes: ["Person"],
    twitterCard: "summary_large_image",
  },
  aiMetadata: {
    creatorTypes: ["individual"],
    industry: ["content creation", "gaming", "streaming"],
    businessGoals: ["build audience", "sell merchandise", "grow community"],
    requiredQuestions: ["What is your main content platform?", "What products do you sell?"],
    recommendedSections: ["hero", "about", "products", "gallery", "links"],
    contentPrompts: { hero: "Create an engaging hero section", about: "Write a compelling bio" },
    imagePrompts: { hero: "A professional banner image", avatar: "A high-quality profile photo" },
    seoPrompts: { title: "Generate an SEO title", description: "Generate a meta description" },
    generationHints: { tone: "energetic", audienceFocus: "fans" },
  },
  onboardingMetadata: { welcomeMessage: "Welcome! Let's set up your Creator storefront." },
  compatibility: { requiresCapabilities: [] },
  inheritance: { parentId: null, mergeStrategy: "replace" },
};

const PORTFOLIO_BLUEPRINT: BlueprintDefinition = {
  id: "com.creatos.portfolio",
  slug: "portfolio",
  name: "Portfolio",
  description: "Showcase your work with a professional portfolio",
  author: { name: "CreatorOS" },
  version: "1.0.0",
  schemaVersion: 1,
  status: "active",
  category: "portfolio",
  tags: ["portfolio", "photography", "design", "art", "creative"],
  pages: [
    { id: "page-home", name: "Home", slug: "/", isHome: true, order: 0, sections: [
      { id: "sec-hero", moduleId: "hero.default", order: 0, visible: true },
      { id: "sec-about", moduleId: "about.default", order: 1, visible: true },
      { id: "sec-gallery", moduleId: "gallery.grid", order: 2, visible: true },
      { id: "sec-testimonials", moduleId: "testimonials.default", order: 3, visible: true },
      { id: "sec-contact", moduleId: "contact.default", order: 4, visible: true },
      { id: "sec-footer", moduleId: "footer.default", order: 5, visible: true },
    ]},
  ],
  navigation: [...BASE_NAV, { id: "gallery", label: "Gallery", href: "#gallery", type: "anchor" as const, order: 3, visible: true }],
  recommendedThemes: ["com.creatos.minimal-light", "com.creatos.slate-minimal", "com.creatos.midnight-ocean"],
  compatibleThemes: [],
  incompatibleThemes: [],
  requiredCapabilities: [],
  featureFlags: { showGallery: true },
  seoDefaults: {
    titlePattern: "{name} — Portfolio",
    descriptionPattern: "{tagline}",
    schemaTypes: ["Person"],
    twitterCard: "summary_large_image",
  },
  aiMetadata: {
    creatorTypes: ["individual", "business"],
    industry: ["photography", "design", "art", "creative"],
    businessGoals: ["attract clients", "showcase work", "build reputation"],
    requiredQuestions: ["What type of work do you create?", "What is your specialty?"],
    recommendedSections: ["hero", "about", "gallery", "testimonials"],
    contentPrompts: { hero: "Showcase your best work", about: "Tell your creative story" },
    imagePrompts: { hero: "Your best portfolio piece", gallery: "Collection of your work" },
    seoPrompts: { title: "Portfolio SEO title", description: "Portfolio description" },
    generationHints: { tone: "professional", visualFocus: "high" },
  },
  onboardingMetadata: { welcomeMessage: "Build your professional portfolio." },
  compatibility: { requiresCapabilities: [] },
  inheritance: { parentId: null, mergeStrategy: "replace" },
};

const BUSINESS_BLUEPRINT: BlueprintDefinition = {
  id: "com.creatos.business",
  slug: "business",
  name: "Business",
  description: "Professional business website with services and contact",
  author: { name: "CreatorOS" },
  version: "1.0.0",
  schemaVersion: 1,
  status: "active",
  category: "business",
  tags: ["business", "professional", "services", "corporate", "consulting"],
  pages: [
    { id: "page-home", name: "Home", slug: "/", isHome: true, order: 0, sections: [
      { id: "sec-hero", moduleId: "hero.default", order: 0, visible: true },
      { id: "sec-about", moduleId: "about.default", order: 1, visible: true },
      { id: "sec-products", moduleId: "products.grid", order: 2, visible: true },
      { id: "sec-testimonials", moduleId: "testimonials.default", order: 3, visible: true },
      { id: "sec-faq", moduleId: "faq.default", order: 4, visible: true },
      { id: "sec-contact", moduleId: "contact.default", order: 5, visible: true },
      { id: "sec-footer", moduleId: "footer.default", order: 6, visible: true },
    ]},
  ],
  navigation: [
    { id: "hero", label: "Home", href: "#hero", type: "anchor" as const, order: 0, visible: true },
    { id: "about", label: "About", href: "#about", type: "anchor" as const, order: 1, visible: true },
    { id: "services", label: "Services", href: "#products", type: "anchor" as const, order: 2, visible: true },
    { id: "testimonials", label: "Testimonials", href: "#testimonials", type: "anchor" as const, order: 3, visible: true },
    { id: "faq", label: "FAQ", href: "#faq", type: "anchor" as const, order: 4, visible: true },
    { id: "contact", label: "Contact", href: "#contact", type: "anchor" as const, order: 5, visible: true },
  ],
  recommendedThemes: ["com.creatos.slate-minimal", "com.creatos.minimal-light"],
  compatibleThemes: ["com.creatos.neon-dark"],
  incompatibleThemes: [],
  requiredCapabilities: [],
  featureFlags: {},
  seoDefaults: {
    titlePattern: "{name} — {tagline}",
    descriptionPattern: "{tagline} — {bio}",
    schemaTypes: ["Organization", "LocalBusiness"],
    twitterCard: "summary_large_image",
  },
  aiMetadata: {
    creatorTypes: ["business", "individual"],
    industry: ["consulting", "professional services", "coaching"],
    businessGoals: ["attract clients", "showcase expertise", "generate leads"],
    requiredQuestions: ["What services do you offer?", "Who is your target client?"],
    recommendedSections: ["hero", "about", "products", "testimonials", "faq"],
    contentPrompts: { hero: "Professional hero with value proposition" },
    imagePrompts: { hero: "Professional workspace or team photo" },
    seoPrompts: { title: "Business SEO title", description: "Business description" },
    generationHints: { tone: "professional", trust: "high" },
  },
  onboardingMetadata: { welcomeMessage: "Set up your business website." },
  compatibility: { requiresCapabilities: [] },
  inheritance: { parentId: null, mergeStrategy: "replace" },
};

const GAMING_BLUEPRINT: BlueprintDefinition = {
  id: "com.creatos.gaming",
  slug: "gaming",
  name: "Gaming",
  description: "Gaming community site with streams, tournaments, and merch",
  author: { name: "CreatorOS" },
  version: "1.0.0",
  schemaVersion: 1,
  status: "active",
  category: "gaming",
  tags: ["gaming", "esports", "streamer", "twitch", "community"],
  pages: [
    { id: "page-home", name: "Home", slug: "/", isHome: true, order: 0, sections: [
      { id: "sec-hero", moduleId: "hero.gaming", order: 0, visible: true, config: { showLiveBadge: true } },
      { id: "sec-about", moduleId: "about.default", order: 1, visible: true },
      { id: "sec-games", moduleId: "games.default", order: 2, visible: true },
      { id: "sec-products", moduleId: "products.grid", order: 3, visible: true },
      { id: "sec-timeline", moduleId: "timeline.default", order: 4, visible: true },
      { id: "sec-links", moduleId: "links.default", order: 5, visible: true },
      { id: "sec-contact", moduleId: "contact.default", order: 6, visible: true },
      { id: "sec-footer", moduleId: "footer.default", order: 7, visible: true },
    ]},
  ],
  navigation: [
    { id: "hero", label: "Home", href: "#hero", type: "anchor" as const, order: 0, visible: true },
    { id: "games", label: "Games", href: "#games", type: "anchor" as const, order: 2, visible: true },
    { id: "products", label: "Merch", href: "#products", type: "anchor" as const, order: 3, visible: true },
    { id: "links", label: "Social", href: "#links", type: "anchor" as const, order: 5, visible: true },
    { id: "contact", label: "Contact", href: "#contact", type: "anchor" as const, order: 6, visible: true },
  ],
  recommendedThemes: ["com.creatos.neon-dark", "com.creatos.warm-ember", "com.creatos.midnight-ocean"],
  compatibleThemes: [],
  incompatibleThemes: ["com.creatos.minimal-light", "com.creatos.slate-minimal"],
  requiredCapabilities: [],
  featureFlags: {},
  seoDefaults: {
    titlePattern: "{name} — Gaming",
    descriptionPattern: "{tagline}",
    schemaTypes: ["Person"],
    twitterCard: "summary_large_image",
  },
  aiMetadata: {
    creatorTypes: ["individual"],
    industry: ["gaming", "esports", "entertainment"],
    businessGoals: ["grow community", "sell merchandise", "stream"],
    requiredQuestions: ["What games do you play?", "What platform do you stream on?"],
    recommendedSections: ["hero", "about", "games", "products", "links"],
    contentPrompts: { hero: "Epic gaming hero", games: "List your games" },
    imagePrompts: { hero: "Gaming banner", games: "Game screenshots" },
    seoPrompts: { title: "Gaming SEO title", description: "Gaming description" },
    generationHints: { tone: "energetic", community: "high" },
  },
  onboardingMetadata: { welcomeMessage: "Level up with your gaming site." },
  compatibility: { requiresCapabilities: [] },
  inheritance: { parentId: null, mergeStrategy: "replace" },
};

const AGENCY_BLUEPRINT: BlueprintDefinition = {
  id: "com.creatos.agency",
  slug: "agency",
  name: "Agency",
  description: "Full-service agency website with portfolio and team showcase",
  author: { name: "CreatorOS" },
  version: "1.0.0",
  schemaVersion: 1,
  status: "active",
  category: "agency",
  tags: ["agency", "studio", "creative", "team", "services"],
  pages: [
    { id: "page-home", name: "Home", slug: "/", isHome: true, order: 0, sections: [
      { id: "sec-hero", moduleId: "hero.default", order: 0, visible: true },
      { id: "sec-about", moduleId: "about.default", order: 1, visible: true },
      { id: "sec-gallery", moduleId: "gallery.grid", order: 2, visible: true },
      { id: "sec-products", moduleId: "products.grid", order: 3, visible: true },
      { id: "sec-testimonials", moduleId: "testimonials.default", order: 4, visible: true },
      { id: "sec-faq", moduleId: "faq.default", order: 5, visible: true },
      { id: "sec-contact", moduleId: "contact.default", order: 6, visible: true },
      { id: "sec-footer", moduleId: "footer.default", order: 7, visible: true },
    ]},
  ],
  navigation: [
    { id: "hero", label: "Home", href: "#hero", type: "anchor" as const, order: 0, visible: true },
    { id: "about", label: "About", href: "#about", type: "anchor" as const, order: 1, visible: true },
    { id: "work", label: "Work", href: "#gallery", type: "anchor" as const, order: 2, visible: true },
    { id: "services", label: "Services", href: "#products", type: "anchor" as const, order: 3, visible: true },
    { id: "testimonials", label: "Testimonials", href: "#testimonials", type: "anchor" as const, order: 4, visible: true },
    { id: "faq", label: "FAQ", href: "#faq", type: "anchor" as const, order: 5, visible: true },
    { id: "contact", label: "Contact", href: "#contact", type: "anchor" as const, order: 6, visible: true },
  ],
  recommendedThemes: ["com.creatos.slate-minimal", "com.creatos.minimal-light", "com.creatos.midnight-ocean"],
  compatibleThemes: [],
  incompatibleThemes: [],
  requiredCapabilities: ["agency_clients"],
  featureFlags: {},
  seoDefaults: {
    titlePattern: "{name} — Agency",
    descriptionPattern: "{tagline}",
    schemaTypes: ["Organization"],
    twitterCard: "summary_large_image",
  },
  aiMetadata: {
    creatorTypes: ["agency", "business"],
    industry: ["creative agency", "marketing", "design studio"],
    businessGoals: ["attract clients", "showcase work", "build credibility"],
    requiredQuestions: ["What services does your agency offer?", "What is your specialty?"],
    recommendedSections: ["hero", "about", "gallery", "products", "testimonials", "faq"],
    contentPrompts: { hero: "Agency value proposition", about: "Team story" },
    imagePrompts: { hero: "Agency workspace", gallery: "Client work showcase" },
    seoPrompts: { title: "Agency SEO title", description: "Agency description" },
    generationHints: { tone: "professional", showcaseQuality: "high" },
  },
  onboardingMetadata: { welcomeMessage: "Build your agency website." },
  compatibility: { requiresCapabilities: ["agency_clients"] },
  inheritance: { parentId: null, mergeStrategy: "replace" },
};

const PODCAST_BLUEPRINT: BlueprintDefinition = {
  id: "com.creatos.podcast",
  slug: "podcast",
  name: "Podcast",
  description: "Podcast website with episodes, show notes, and subscription links",
  author: { name: "CreatorOS" },
  version: "1.0.0",
  schemaVersion: 1,
  status: "active",
  category: "podcast",
  tags: ["podcast", "audio", "broadcast", "show", "episodes"],
  pages: [
    { id: "page-home", name: "Home", slug: "/", isHome: true, order: 0, sections: [
      { id: "sec-hero", moduleId: "hero.default", order: 0, visible: true },
      { id: "sec-about", moduleId: "about.default", order: 1, visible: true },
      { id: "sec-timeline", moduleId: "timeline.default", order: 2, visible: true },
      { id: "sec-products", moduleId: "products.grid", order: 3, visible: true },
      { id: "sec-testimonials", moduleId: "testimonials.default", order: 4, visible: true },
      { id: "sec-links", moduleId: "links.default", order: 5, visible: true },
      { id: "sec-contact", moduleId: "contact.default", order: 6, visible: true },
      { id: "sec-footer", moduleId: "footer.default", order: 7, visible: true },
    ]},
  ],
  navigation: [
    { id: "hero", label: "Home", href: "#hero", type: "anchor" as const, order: 0, visible: true },
    { id: "episodes", label: "Episodes", href: "#timeline", type: "anchor" as const, order: 2, visible: true },
    { id: "links", label: "Subscribe", href: "#links", type: "anchor" as const, order: 5, visible: true },
    { id: "contact", label: "Contact", href: "#contact", type: "anchor" as const, order: 6, visible: true },
  ],
  recommendedThemes: ["com.creatos.neon-dark", "com.creatos.midnight-ocean", "com.creatos.minimal-light"],
  compatibleThemes: [],
  incompatibleThemes: [],
  requiredCapabilities: [],
  featureFlags: {},
  seoDefaults: {
    titlePattern: "{name} — Podcast",
    descriptionPattern: "{tagline}",
    schemaTypes: ["PodcastSeries"],
    twitterCard: "summary_large_image",
  },
  aiMetadata: {
    creatorTypes: ["individual", "business"],
    industry: ["podcasting", "media", "entertainment"],
    businessGoals: ["grow listeners", "monetize episodes", "build audience"],
    requiredQuestions: ["What is your podcast about?", "How often do you publish?"],
    recommendedSections: ["hero", "about", "timeline", "products", "links"],
    contentPrompts: { hero: "Podcast hero with latest episode" },
    imagePrompts: { hero: "Podcast cover art" },
    seoPrompts: { title: "Podcast SEO title", description: "Podcast description" },
    generationHints: { tone: "conversational", audience: "niche" },
  },
  onboardingMetadata: { welcomeMessage: "Launch your podcast website." },
  compatibility: { requiresCapabilities: [] },
  inheritance: { parentId: null, mergeStrategy: "replace" },
};

const BUILT_IN_BLUEPRINTS: BlueprintDefinition[] = [
  CREATOR_BLUEPRINT,
  PORTFOLIO_BLUEPRINT,
  BUSINESS_BLUEPRINT,
  GAMING_BLUEPRINT,
  AGENCY_BLUEPRINT,
  PODCAST_BLUEPRINT,
];

export class BuiltInBlueprintProvider {
  readonly type = "built-in";

  getAll(): BlueprintDefinition[] { return BUILT_IN_BLUEPRINTS.map((b) => ({ ...b })); }
  getById(id: string): BlueprintDefinition | undefined { return BUILT_IN_BLUEPRINTS.find((b) => b.id === id); }

  list(options?: { category?: string; search?: string }): BlueprintDefinition[] {
    let results = [...BUILT_IN_BLUEPRINTS];
    if (options?.category) results = results.filter((b) => b.category === options.category);
    if (options?.search) {
      const q = options.search.toLowerCase();
      results = results.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return results;
  }
}

export const builtInBlueprintProvider = new BuiltInBlueprintProvider();
