import { prisma } from "@/lib/prisma";
import type { Template } from "@/lib/template/registry";

type StrategyId = "fast" | "balanced" | "premium";

const PLACEHOLDER_PRODUCTS = [
  { name: "Welcome Pack", description: "Starter bundle — customize this product with your own details, pricing, and images.", price: 9.99 },
  { name: "Premium Bundle", description: "Premium offering — add your best content, exclusive access, or digital goods.", price: 29.99 },
  { name: "Exclusive Access", description: "Membership tier — set your own price and describe what members get.", price: 49.99 },
];

const PLACEHOLDER_GALLERY = [
  { title: "Featured Work", description: "Replace this with your best image or video content." },
  { title: "Coming Soon", description: "Use this space to tease your next big launch or project." },
  { title: "Behind the Scenes", description: "Show your audience how you create — authenticity builds trust." },
  { title: "Highlights", description: "Showcase your most popular or impactful moments here." },
];

const PLACEHOLDER_TIMELINE = [
  { year: "2024", title: "Started the Journey", description: "Replace this milestone with your actual start date and story." },
  { year: "2025", title: "First Big Milestone", description: "Describe your first major achievement, launch, or breakthrough." },
  { year: "2026", title: "Where We Are Now", description: "Share what you are currently building or working on." },
];

const PLACEHOLDER_AFFILIATES = [
  { title: "Recommended Tool", url: "#", description: "Link to a tool or service you recommend." },
  { title: "Partner Offer", url: "#", description: "Promote a partner product or affiliate program." },
];

function listModules(template: Template): string[] {
  const moduleSet = new Set<string>();
  for (const page of template.pages) {
    for (const section of page.sections) {
      for (const block of section.blocks) {
        moduleSet.add(block.moduleId);
      }
    }
  }
  return Array.from(moduleSet);
}

function productData(name: string, description: string, price: number, creatorName?: string) {
  const named = creatorName
    ? { name: name.replace(/your|this/i, `${creatorName}'s`) }
    : {};
  return { name: named.name || name, description, price, imageUrl: null, order: 0, isActive: true };
}

function galleryData(title: string, description: string) {
  return { title, description, imageUrl: "/placeholder.svg", mediaType: "image" as const, videoUrl: null, category: "general", order: 0, isActive: true };
}

function timelineData(year: string, title: string, description: string) {
  return { year, title, description, imageUrl: null, stats: null, order: 0, isActive: true };
}

export async function seedStarterData(
  template: Template,
  tenantId: string,
  strategy: StrategyId,
  creatorName?: string,
): Promise<void> {
  const modules = listModules(template);
  const isInstructional = strategy === "fast";

  // Products
  if (modules.some((m) => m.startsWith("products."))) {
    const products = isInstructional
      ? PLACEHOLDER_PRODUCTS
      : [
          { name: creatorName ? `${creatorName}'s Collection` : "Signature Collection", description: "Handpicked items curated just for you. Each piece reflects quality and care.", price: 19.99 },
          { name: "Digital Bundle", description: "Instant access to premium digital content, guides, and resources.", price: 34.99 },
          { name: "VIP Membership", description: "Exclusive community access, early releases, and members-only perks.", price: 59.99 },
        ];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      await prisma.product.create({
        data: {
          tenantId,
          ...productData(p.name, p.description, p.price, isInstructional ? undefined : creatorName),
          order: i,
        },
      });
    }
  }

  // Gallery
  if (modules.some((m) => m.startsWith("gallery."))) {
    const gallery = isInstructional ? PLACEHOLDER_GALLERY : [
      { title: "Latest Creations", description: "A showcase of our most recent work and creative projects." },
      { title: "Events & Appearances", description: "Moments captured from live events, meetups, and special occasions." },
      { title: "Fan Spotlight", description: "Celebrating the amazing content and stories shared by our community." },
    ];

    for (let i = 0; i < gallery.length; i++) {
      const g = gallery[i];
      await prisma.galleryImage.create({
        data: {
          tenantId,
          ...galleryData(g.title, g.description),
          order: i,
        },
      });
    }
  }

  // Timeline
  if (modules.some((m) => m.startsWith("timeline."))) {
    for (let i = 0; i < PLACEHOLDER_TIMELINE.length; i++) {
      const t = PLACEHOLDER_TIMELINE[i];
      await prisma.timelineEvent.create({
        data: {
          tenantId,
          ...timelineData(t.year, t.title, t.description),
          order: i,
        },
      });
    }
  }

  // Affiliate links
  if (modules.some((m) => m.startsWith("affiliate.") || m.startsWith("links."))) {
    for (let i = 0; i < PLACEHOLDER_AFFILIATES.length; i++) {
      const a = PLACEHOLDER_AFFILIATES[i];
      await prisma.affiliateLink.create({
        data: {
          tenantId,
          title: a.title,
          url: a.url,
          imageUrl: null,
          order: i,
          isActive: true,
        },
      });
    }
  }
}
