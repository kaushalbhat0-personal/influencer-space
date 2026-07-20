import { prisma } from "@/lib/prisma";

export async function galleryDataLoader(tenantId: string, _c: Record<string, unknown>, _x: Record<string, unknown>) {
  void _c; void _x;
  const rows = await prisma.galleryImage.findMany({ where: { tenantId, isActive: true }, orderBy: [{ order: "asc" }, { createdAt: "desc" }], select: { id: true, title: true, description: true, imageUrl: true, mediaType: true, videoUrl: true } });
  return rows.map((g) => ({ id: g.id, url: g.mediaType === "video" && g.videoUrl ? g.videoUrl : g.imageUrl, caption: g.description || g.title, isVideo: g.mediaType === "video" }));
}

export async function timelineDataLoader(tenantId: string, _c: Record<string, unknown>, _x: Record<string, unknown>) {
  void _c; void _x;
  return prisma.timelineEvent.findMany({ where: { tenantId, isActive: true }, orderBy: { year: "desc" }, select: { id: true, year: true, title: true, description: true, imageUrl: true, stats: true } });
}

export async function contentFeedDataLoader(tenantId: string, _c: Record<string, unknown>, _x: Record<string, unknown>) {
  void _c; void _x;
  const { getContentFeed } = await import("@/services/content-feed.service");
  return getContentFeed(tenantId);
}

export async function profileDataLoader(tenantId: string, _c: Record<string, unknown>, _x: Record<string, unknown>) {
  void _c; void _x;
  const data = await import("@/services/settings.service").then((m) => m.SettingsService.getInfluencerData(tenantId));
  const cfg = await import("@/config/influencer").then((m) => m.defaultConfig);
  return { ...cfg, ...data };
}

export async function affiliateLinksDataLoader(tenantId: string, _c: Record<string, unknown>, _x: Record<string, unknown>) {
  void _c; void _x;
  return prisma.affiliateLink.findMany({ where: { tenantId, isActive: true }, orderBy: [{ order: "asc" }, { createdAt: "desc" }], select: { id: true, title: true, url: true, imageUrl: true, clicks: true } });
}

export async function gamesDataLoader(tenantId: string, _c: Record<string, unknown>, _x: Record<string, unknown>) {
  void _c; void _x;
  return prisma.game.findMany({ where: { tenantId, isActive: true }, orderBy: { order: "asc" } });
}

export async function contactDataLoader(tenantId: string, _c: Record<string, unknown>, _x: Record<string, unknown>) {
  void _c; void _x;
  return { tenantId };
}
