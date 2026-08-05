/**
 * Creator Success Runtime — RCCF-IMPLEMENTATION-63
 *
 * Tracks creator milestones, computes progress, and recommends next steps.
 * No creator should ever see an empty dashboard — always know what to do next.
 */
import { prisma } from "@/lib/prisma";

export interface CreatorMilestone {
  id: string;
  label: string;
  description: string;
  action: string;
  href: string;
  estimatedMinutes: number;
  category: "website" | "commerce" | "brand" | "growth";
  priority: number; // lower = show first
  done: boolean;
}

const MILESTONES: Omit<CreatorMilestone, "done">[] = [
  { id: "account", label: "Account created", description: "Your CreatorStore account is ready", action: "Done", href: "", estimatedMinutes: 0, category: "website", priority: 1 },
  { id: "website", label: "Website generated", description: "AI built your storefront", action: "View your site", href: "", estimatedMinutes: 0, category: "website", priority: 2 },
  { id: "hero", label: "Customize your homepage", description: "Make your hero section your own", action: "Edit Hero", href: "/admin/settings", estimatedMinutes: 3, category: "website", priority: 3 },
  { id: "logo", label: "Upload your logo", description: "Brand your storefront", action: "Upload Logo", href: "/admin/appearance", estimatedMinutes: 1, category: "brand", priority: 4 },
  { id: "product", label: "Create your first product", description: "Start selling — add a product or service", action: "Create Product", href: "/admin/products", estimatedMinutes: 3, category: "commerce", priority: 5 },
  { id: "booking", label: "Enable bookings", description: "Let customers book appointments", action: "Create Booking", href: "/admin/bookings", estimatedMinutes: 2, category: "commerce", priority: 6 },
  { id: "gallery", label: "Upload gallery images", description: "Showcase your work", action: "Upload Images", href: "/admin/gallery", estimatedMinutes: 5, category: "brand", priority: 7 },
  { id: "domain", label: "Connect custom domain", description: "Use your own domain name", action: "Connect Domain", href: "/admin/settings/domain", estimatedMinutes: 5, category: "growth", priority: 8 },
  { id: "publish", label: "Publish your website", description: "Make your storefront live", action: "Publish", href: "/builder", estimatedMinutes: 2, category: "website", priority: 9 },
  { id: "share", label: "Share your storefront", description: "Get your first visitors", action: "Share Link", href: "", estimatedMinutes: 1, category: "growth", priority: 10 },
  { id: "order", label: "Receive first order", description: "Someone buys your product — milestone!", action: "View Orders", href: "/admin/orders", estimatedMinutes: 0, category: "commerce", priority: 11 },
];

export interface CreatorSuccessData {
  completedMilestones: number;
  totalMilestones: number;
  completionPercent: number;
  milestones: CreatorMilestone[];
  nextTask: CreatorMilestone | null;
  nextTaskEstimatedMinutes: number;
  categoryProgress: Record<string, number>;
}

export async function getCreatorSuccess(tenantId: string, storefrontUrl?: string): Promise<CreatorSuccessData> {
  const [products, bookings, gallery, domain, website, orders, settings] = await Promise.all([
    prisma.product.count({ where: { tenantId } }).catch(() => 0),
    prisma.booking.count({ where: { tenantId } }).catch(() => 0),
    prisma.galleryImage.count({ where: { tenantId } }).catch(() => 0),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { customDomain: true } }).catch(() => null),
    prisma.website.findUnique({ where: { tenantId }, select: { id: true, publishStatus: { select: { state: true } } } }).catch(() => null),
    prisma.productOrder.count({ where: { tenantId, status: { in: ["PAID", "COMPLETED"] } } }).catch(() => 0),
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "brand_config" } } }).catch(() => null),
  ]);

  const checks: Record<string, boolean> = {
    account: true, // always done — they're on the dashboard
    website: !!website,
    hero: !!settings, // brand_config setting exists
    logo: !!settings,
    product: products > 0,
    booking: bookings > 0,
    gallery: gallery > 0,
    domain: !!domain?.customDomain,
    publish: website?.publishStatus?.state === "live",
    share: true, // always available
    order: orders > 0,
  };

  const milestones: CreatorMilestone[] = MILESTONES.map((m) => {
    if (m.id === "website" && storefrontUrl) return { ...m, done: true, href: storefrontUrl, action: "View your site" };
    return { ...m, done: checks[m.id] ?? false };
  });

  const done = milestones.filter((m) => m.done).length;
  const total = milestones.length;
  const next = milestones.find((m) => !m.done) ?? null;

  const categoryProgress: Record<string, number> = {};
  for (const m of milestones) {
    const cat = m.category;
    if (!categoryProgress[cat]) categoryProgress[cat] = 0;
    if (m.done) categoryProgress[cat]++;
  }
  for (const cat of Object.keys(categoryProgress)) {
    const catTotal = milestones.filter((m) => m.category === cat).length;
    categoryProgress[cat] = Math.round((categoryProgress[cat] / catTotal) * 100);
  }

  return {
    completedMilestones: done,
    totalMilestones: total,
    completionPercent: Math.round((done / total) * 100),
    milestones,
    nextTask: next,
    nextTaskEstimatedMinutes: next?.estimatedMinutes ?? 0,
    categoryProgress,
  };
}
