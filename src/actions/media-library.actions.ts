"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assetRepository } from "@/lib/media/repositories/asset-repository";
import { mediaService } from "@/lib/media/service";
import { prisma } from "@/lib/prisma";
import { uploadAsset } from "./media.actions";
import { afterContentChange } from "@/lib/publishing/content-change";

async function requireTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}

/** Human label + admin navigation for a single asset reference. */
export async function resolveAssetReferences(assetId: string) {
  try {
    const tenantId = await requireTenant();
    const asset = await prisma.asset.findUnique({
      where: { id: assetId, tenantId },
      select: { references: { select: { entityType: true, entityId: true, field: true } } },
    });
    if (!asset) return { success: false, usages: [], error: "Asset not found" };

    const usages = await resolveUsageLabels(tenantId, asset.references);
    return { success: true, usages };
  } catch (error) {
    return { success: false, usages: [], error: error instanceof Error ? error.message : "Failed to resolve references" };
  }
}

interface RawReference { entityType: string; entityId: string; field: string | null }

async function resolveUsageLabels(tenantId: string, refs: RawReference[]) {
  const entityIds = [...Array.from(new Set(refs.map((r) => r.entityId)))];
  const [products, gallery, timeline, games] = await Promise.all([
    prisma.product.findMany({ where: { tenantId, id: { in: entityIds } }, select: { id: true, name: true } }),
    prisma.galleryImage.findMany({ where: { tenantId, id: { in: entityIds } }, select: { id: true, title: true } }),
    prisma.timelineEvent.findMany({ where: { tenantId, id: { in: entityIds } }, select: { id: true, title: true } }),
    prisma.game.findMany({ where: { tenantId, id: { in: entityIds } }, select: { id: true, name: true } }),
  ]);

  const productName = new Map(products.map((p) => [p.id, p.name]));
  const galleryTitle = new Map(gallery.map((g) => [g.id, g.title]));
  const timelineTitle = new Map(timeline.map((t) => [t.id, t.title]));
  const gameName = new Map(games.map((g) => [g.id, g.name]));

  const FIELD_LABELS: Record<string, string> = {
    videoUrl: "Hero Video",
    posterUrl: "Hero Poster",
    backgroundUrl: "Hero Background",
    profilePictureUrl: "Profile Picture",
    imageUrl: "Image",
    avatarUrl: "Avatar",
    bannerUrl: "Banner",
    logoUrl: "Logo",
  };

  return refs.map((r) => {
    const type = r.entityType;
    if (type === "hero") {
      return { label: FIELD_LABELS[r.field ?? ""] ?? "Hero", href: "/admin/settings" };
    }
    if (type === "profile") {
      return { label: "Profile Picture", href: "/admin/settings" };
    }
    if (type === "product") {
      return { label: `Product: ${productName.get(r.entityId) ?? r.entityId.slice(0, 8)}`, href: "/admin/products" };
    }
    if (type === "gallery") {
      return { label: `Gallery: ${galleryTitle.get(r.entityId) ?? "Image"}`, href: "/admin/gallery" };
    }
    if (type === "timeline") {
      return { label: `Timeline: ${timelineTitle.get(r.entityId) ?? "Event"}`, href: "/admin/milestones" };
    }
    if (type === "game") {
      return { label: `Game: ${gameName.get(r.entityId) ?? r.entityId.slice(0, 8)}`, href: "/admin/games" };
    }
    return { label: `${type}: ${r.entityId.slice(0, 8)}`, href: "#" };
  });
}

export async function listAssets(params?: {
  search?: string;
  mimeType?: string;
  status?: string;
  sortBy?: "createdAt" | "updatedAt" | "filename" | "size";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}) {
  try {
    const tenantId = await requireTenant();
    const result = await assetRepository.findByTenant(tenantId, {
      search: params?.search,
      mimeType: params?.mimeType,
      status: params?.status ?? "ACTIVE",
      sortBy: params?.sortBy ?? "createdAt",
      sortOrder: params?.sortOrder ?? "desc",
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, assets: [], total: 0, error: error instanceof Error ? error.message : "Failed to list assets" };
  }
}

export async function getAsset(assetId: string) {
  try {
    await requireTenant();
    const asset = await assetRepository.findById(assetId);
    return { success: true, asset };
  } catch (error) {
    return { success: false, asset: null, error: error instanceof Error ? error.message : "Failed to get asset" };
  }
}

export async function deleteAssetFromLibrary(assetId: string) {
  try {
    const tenantId = await requireTenant();
    await mediaService.delete(assetId);
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Delete failed" };
  }
}

export async function purgeAsset(assetId: string) {
  try {
    const tenantId = await requireTenant();
    await mediaService.purge(assetId);
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Purge failed" };
  }
}

export async function replaceAsset(assetId: string, formData: FormData) {
  try {
    const tenantId = await requireTenant();
    const file = formData.get("file") as File | null;
    if (!file) return { success: false, error: "No file provided" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mediaService.replace({
      assetId,
      file: { filename: file.name, mimeType: file.type, size: file.size, buffer },
    });
    await afterContentChange(tenantId);

    return { success: true, url: result.url };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Replace failed" };
  }
}

export async function removeAssetReference(
  assetId: string,
  entityType: string,
  entityId: string,
  entityField?: string,
) {
  try {
    await requireTenant();
    await mediaService.removeReference(assetId, entityType, entityId, entityField);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to remove reference" };
  }
}

export async function createAssetReference(
  assetId: string,
  entityType: string,
  entityId: string,
  entityField?: string,
) {
  try {
    const tenantId = await requireTenant();
    await mediaService.createReference(assetId, tenantId, entityType, entityId, entityField);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create reference" };
  }
}

export { uploadAsset as uploadToLibrary };
