export interface TemplateBlock {
  moduleId: string;
  order: number;
  config?: Record<string, unknown>;
}

export interface TemplateSection {
  name: string;
  type: string;
  order: number;
  blocks: TemplateBlock[];
}

export interface TemplatePage {
  name: string;
  slug: string;
  isHome: boolean;
  order: number;
  sections: TemplateSection[];
}

export interface TemplateNavItem {
  label: string;
  href: string;
  order: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  pages: TemplatePage[];
  navigation: TemplateNavItem[];
}

const GAMING: Template = {
  id: "gaming",
  name: "Gaming Creator",
  description: "Hero with live badge, gallery, products, timeline, social links",
  category: "gaming",
  pages: [
    {
      name: "Home", slug: "/", isHome: true, order: 0,
      sections: [
        { name: "Hero", type: "hero", order: 0, blocks: [{ moduleId: "hero.gaming", order: 0, config: { showLiveBadge: true } }] },
        { name: "About", type: "about", order: 1, blocks: [{ moduleId: "about.default", order: 0 }] },
        { name: "Gallery", type: "gallery", order: 2, blocks: [{ moduleId: "gallery.grid", order: 0 }] },
        { name: "Products", type: "products", order: 3, blocks: [{ moduleId: "products.grid", order: 0 }] },
        { name: "Timeline", type: "timeline", order: 4, blocks: [{ moduleId: "timeline.default", order: 0 }] },
        { name: "Links", type: "links", order: 5, blocks: [{ moduleId: "links.default", order: 0 }] },
        { name: "Footer", type: "footer", order: 6, blocks: [{ moduleId: "footer.default", order: 0 }] },
      ],
    },
  ],
  navigation: [
    { label: "Home", href: "/", order: 0 },
    { label: "Store", href: "/store", order: 1 },
    { label: "Gallery", href: "/gallery", order: 2 },
    { label: "Links", href: "/links", order: 3 },
  ],
};

const FITNESS: Template = {
  id: "fitness",
  name: "Fitness Coach",
  description: "Hero, programs, testimonials, timeline, contact",
  category: "fitness",
  pages: [
    {
      name: "Home", slug: "/", isHome: true, order: 0,
      sections: [
        { name: "Hero", type: "hero", order: 0, blocks: [{ moduleId: "hero.fitness", order: 0, config: { cta: "Join Now" } }] },
        { name: "About", type: "about", order: 1, blocks: [{ moduleId: "about.default", order: 0 }] },
        { name: "Products", type: "products", order: 2, blocks: [{ moduleId: "products.grid", order: 0 }] },
        { name: "Timeline", type: "timeline", order: 3, blocks: [{ moduleId: "timeline.default", order: 0 }] },
        { name: "Links", type: "links", order: 4, blocks: [{ moduleId: "links.default", order: 0 }] },
        { name: "Footer", type: "footer", order: 5, blocks: [{ moduleId: "footer.default", order: 0 }] },
      ],
    },
  ],
  navigation: [
    { label: "Home", href: "/", order: 0 },
    { label: "Programs", href: "/programs", order: 1 },
    { label: "About", href: "/about", order: 2 },
    { label: "Contact", href: "/contact", order: 3 },
  ],
};

const EDUCATION: Template = {
  id: "education",
  name: "Education Creator",
  description: "Courses, testimonials, blog-like layout, contact",
  category: "education",
  pages: [
    {
      name: "Home", slug: "/", isHome: true, order: 0,
      sections: [
        { name: "Hero", type: "hero", order: 0, blocks: [{ moduleId: "hero.education", order: 0, config: { subtitle: "Learn from the best" } }] },
        { name: "About", type: "about", order: 1, blocks: [{ moduleId: "about.default", order: 0 }] },
        { name: "Products", type: "products", order: 2, blocks: [{ moduleId: "products.grid", order: 0 }] },
        { name: "Gallery", type: "gallery", order: 3, blocks: [{ moduleId: "gallery.grid", order: 0 }] },
        { name: "Links", type: "links", order: 4, blocks: [{ moduleId: "links.default", order: 0 }] },
        { name: "Footer", type: "footer", order: 5, blocks: [{ moduleId: "footer.default", order: 0 }] },
      ],
    },
  ],
  navigation: [
    { label: "Home", href: "/", order: 0 },
    { label: "Courses", href: "/courses", order: 1 },
    { label: "About", href: "/about", order: 2 },
  ],
};

const MUSIC: Template = {
  id: "music",
  name: "Music Artist",
  description: "Hero with player, discography, merch, tour dates, links",
  category: "music",
  pages: [
    {
      name: "Home", slug: "/", isHome: true, order: 0,
      sections: [
        { name: "Hero", type: "hero", order: 0, blocks: [{ moduleId: "hero.music", order: 0 }] },
        { name: "About", type: "about", order: 1, blocks: [{ moduleId: "about.default", order: 0 }] },
        { name: "Products", type: "products", order: 2, blocks: [{ moduleId: "products.grid", order: 0 }] },
        { name: "Gallery", type: "gallery", order: 3, blocks: [{ moduleId: "gallery.grid", order: 0 }] },
        { name: "Links", type: "links", order: 4, blocks: [{ moduleId: "links.default", order: 0 }] },
        { name: "Footer", type: "footer", order: 5, blocks: [{ moduleId: "footer.default", order: 0 }] },
      ],
    },
  ],
  navigation: [
    { label: "Home", href: "/", order: 0 },
    { label: "Music", href: "/music", order: 1 },
    { label: "Store", href: "/store", order: 2 },
    { label: "Links", href: "/links", order: 3 },
  ],
};

const RESTAURANT: Template = {
  id: "restaurant",
  name: "Restaurant / Chef",
  description: "Menu showcase, gallery, reviews, contact, reservations",
  category: "restaurant",
  pages: [
    {
      name: "Home", slug: "/", isHome: true, order: 0,
      sections: [
        { name: "Hero", type: "hero", order: 0, blocks: [{ moduleId: "hero.restaurant", order: 0 }] },
        { name: "About", type: "about", order: 1, blocks: [{ moduleId: "about.default", order: 0 }] },
        { name: "Products", type: "products", order: 2, blocks: [{ moduleId: "products.grid", order: 0 }] },
        { name: "Gallery", type: "gallery", order: 3, blocks: [{ moduleId: "gallery.grid", order: 0 }] },
        { name: "Links", type: "links", order: 4, blocks: [{ moduleId: "links.default", order: 0 }] },
        { name: "Footer", type: "footer", order: 5, blocks: [{ moduleId: "footer.default", order: 0 }] },
      ],
    },
  ],
  navigation: [
    { label: "Home", href: "/", order: 0 },
    { label: "Menu", href: "/menu", order: 1 },
    { label: "Gallery", href: "/gallery", order: 2 },
    { label: "Contact", href: "/contact", order: 3 },
  ],
};

const PORTFOLIO: Template = {
  id: "portfolio",
  name: "Creative Portfolio",
  description: "Fullscreen hero, project showcase, gallery, contact",
  category: "portfolio",
  pages: [
    {
      name: "Home", slug: "/", isHome: true, order: 0,
      sections: [
        { name: "Hero", type: "hero", order: 0, blocks: [{ moduleId: "hero.portfolio", order: 0, config: { fullscreen: true } }] },
        { name: "About", type: "about", order: 1, blocks: [{ moduleId: "about.default", order: 0 }] },
        { name: "Gallery", type: "gallery", order: 2, blocks: [{ moduleId: "gallery.grid", order: 0 }] },
        { name: "Products", type: "products", order: 3, blocks: [{ moduleId: "products.grid", order: 0 }] },
        { name: "Links", type: "links", order: 4, blocks: [{ moduleId: "links.default", order: 0 }] },
        { name: "Footer", type: "footer", order: 5, blocks: [{ moduleId: "footer.default", order: 0 }] },
      ],
    },
  ],
  navigation: [
    { label: "Home", href: "/", order: 0 },
    { label: "Projects", href: "/projects", order: 1 },
    { label: "Gallery", href: "/gallery", order: 2 },
    { label: "Contact", href: "/contact", order: 3 },
  ],
};

const AGENCY: Template = {
  id: "agency",
  name: "Agency",
  description: "Services, case studies, team, clients, contact",
  category: "agency",
  pages: [
    {
      name: "Home", slug: "/", isHome: true, order: 0,
      sections: [
        { name: "Hero", type: "hero", order: 0, blocks: [{ moduleId: "hero.agency", order: 0 }] },
        { name: "About", type: "about", order: 1, blocks: [{ moduleId: "about.default", order: 0 }] },
        { name: "Products", type: "products", order: 2, blocks: [{ moduleId: "products.grid", order: 0 }] },
        { name: "Gallery", type: "gallery", order: 3, blocks: [{ moduleId: "gallery.grid", order: 0 }] },
        { name: "Links", type: "links", order: 4, blocks: [{ moduleId: "links.default", order: 0 }] },
        { name: "Footer", type: "footer", order: 5, blocks: [{ moduleId: "footer.default", order: 0 }] },
      ],
    },
  ],
  navigation: [
    { label: "Home", href: "/", order: 0 },
    { label: "Services", href: "/services", order: 1 },
    { label: "Work", href: "/work", order: 2 },
    { label: "Contact", href: "/contact", order: 3 },
  ],
};

const ALL_TEMPLATES: Template[] = [GAMING, FITNESS, EDUCATION, MUSIC, RESTAURANT, PORTFOLIO, AGENCY];

export class TemplateRegistry {
  getAll(): Template[] {
    return ALL_TEMPLATES;
  }

  getById(id: string): Template | undefined {
    return ALL_TEMPLATES.find((t) => t.id === id);
  }

  getByCategory(category: string): Template[] {
    return ALL_TEMPLATES.filter((t) => t.category === category);
  }

  inferFromName(name: string): Template {
    const lower = name.toLowerCase();
    if (lower.includes("gaming") || lower.includes("game") || lower.includes("stream") || lower.includes("pro")) return GAMING;
    if (lower.includes("fit") || lower.includes("health") || lower.includes("wellness") || lower.includes("coach")) return FITNESS;
    if (lower.includes("teach") || lower.includes("learn") || lower.includes("course") || lower.includes("edu") || lower.includes("train")) return EDUCATION;
    if (lower.includes("music") || lower.includes("band") || lower.includes("song") || lower.includes("artist")) return MUSIC;
    if (lower.includes("food") || lower.includes("chef") || lower.includes("cook") || lower.includes("recipe") || lower.includes("restaurant")) return RESTAURANT;
    if (lower.includes("photo") || lower.includes("design") || lower.includes("art") || lower.includes("creative") || lower.includes("portfolio")) return PORTFOLIO;
    if (lower.includes("agency") || lower.includes("studio") || lower.includes("consult")) return AGENCY;
    return GAMING;
  }
}

export const templateRegistry = new TemplateRegistry();
