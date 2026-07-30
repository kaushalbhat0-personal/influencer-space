import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { Template } from "@/lib/template/registry";
import { productRepository } from "@/modules/tenant/infrastructure/product-repository";
import { galleryRepository } from "@/modules/tenant/infrastructure/gallery-repository";
import { linkRepository } from "@/modules/tenant/infrastructure/link-repository";

type StrategyId = "fast" | "balanced" | "premium";

const PLACEHOLDER_PRODUCTS = [
  { name: "Welcome Pack", description: "Essential starter bundle for new followers", price: 9.99 },
  { name: "Premium Bundle", description: "Exclusive content bundle with bonus materials", price: 29.99 },
  { name: "Exclusive Access", description: "VIP access to private community and early releases", price: 49.99 },
];

const PLACEHOLDER_GALLERY = [
  { title: "Featured Work", description: "Curated collection of our best work" },
  { title: "Coming Soon", description: "Sneak peek of upcoming projects" },
  { title: "Behind the Scenes", description: "A look behind the curtain" },
  { title: "Highlights", description: "Best moments captured" },
];

const PLACEHOLDER_TIMELINE = [
  { year: "2024", title: "Started the Journey", description: "Launched our first website on CreatorOS" },
  { year: "2025", title: "First Big Milestone", description: "Reached our first major achievement" },
  { year: "2026", title: "Where We Are Now", description: "Continuing to grow and create" },
];

const PLACEHOLDER_AFFILIATES = [
  { title: "Recommended Tool", url: "#", description: "Tool we use and recommend" },
  { title: "Partner Offer", url: "#", description: "Exclusive partner deal" },
];

const INSTRUCTIONAL_PRODUCTS = [
  { name: "Product Name", description: "Describe what this product is", price: 9.99 },
  { name: "Another Product", description: "Add pricing, images, and variants", price: 19.99 },
];

const INSTRUCTIONAL_GALLERY = [
  { title: "Your Title", description: "Add a description" },
  { title: "Another Item", description: "Replace with your content" },
];

const INSTRUCTIONAL_TIMELINE = [
  { year: new Date().getFullYear().toString(), title: "Your First Milestone", description: "Describe your achievement" },
];

const DATA_SETS: Record<string, { products: typeof PLACEHOLDER_PRODUCTS; gallery: typeof PLACEHOLDER_GALLERY; timeline: typeof PLACEHOLDER_TIMELINE }> = {
  balanced: { products: PLACEHOLDER_PRODUCTS, gallery: PLACEHOLDER_GALLERY, timeline: PLACEHOLDER_TIMELINE },
  premium: { products: PLACEHOLDER_PRODUCTS, gallery: PLACEHOLDER_GALLERY, timeline: PLACEHOLDER_TIMELINE },
};

export async function seedStarterData(
  template: Template,
  tenantId: string,
  strategy: StrategyId,
  creatorName?: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const db = tx ?? prisma;
  const isFast = strategy === "fast";
  const data = isFast
    ? { products: INSTRUCTIONAL_PRODUCTS, gallery: INSTRUCTIONAL_GALLERY, timeline: INSTRUCTIONAL_TIMELINE }
    : DATA_SETS[strategy] ?? DATA_SETS.balanced;

  if (template.modules?.products?.enabled) {
    for (const product of data.products) {
      await productRepository.create({
        tenantId,
        name: creatorName ? `${creatorName}'s ${product.name}` : product.name,
        description: product.description,
        price: product.price,
        isActive: true,
        isFeatured: false,
        slug: product.name.toLowerCase().replace(/\s+/g, "-"),
        images: [],
      }, db);
    }
  }

  if (template.modules?.gallery?.enabled) {
    for (const item of data.gallery) {
      await galleryRepository.create({
        tenantId,
        title: item.title,
        description: item.description,
        imageUrl: "/placeholder.svg",
        mediaType: "image",
      }, db);
    }
  }

  if (template.modules?.timeline?.enabled) {
    for (const event of data.timeline) {
      await prisma.timelineEvent.create({
        data: { tenantId, year: event.year, title: event.title, description: event.description },
      });
    }
  }

  if (template.modules?.links?.enabled) {
    for (const link of PLACEHOLDER_AFFILIATES) {
      await linkRepository.create({
        tenantId,
        title: link.title,
        url: link.url,
      }, db);
    }
  }
}
