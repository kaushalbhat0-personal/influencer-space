/**
 * Content Application Service v1.1.0
 *
 * CQRS-ready content orchestration.
 *
 * Public API remains ContentApplicationService with flat methods.
 * Internally split into commands (writes) and queries (reads).
 * When read models diverge (search, analytics, feeds), extract
 * ContentQueryService independently — zero changes to consumers.
 *
 * Architecture:
 *
 *   ContentApplicationService (facade)
 *   ├── commands: ContentCommandService
 *   │     └── create/update/delete/publish/archive
 *   └── queries: ContentQueryService
 *         └── list/find/stats/search
 */

import { contentAPI } from "@/lib/content/api";
import { BaseAppService } from "./base";
import type { ServiceResult, CommandResult } from "./types";
import type {
  ProductDTO,
  CreateProductDTO,
  UpdateProductDTO,
  ProductStatsDTO,
} from "./dtos/products";
import type { GalleryDTO, CreateGalleryDTO } from "./dtos/gallery";
import type { GalleryMedia } from "@/lib/content/entities/gallery/types";

// ── DTO MAPPERS ──────────────────────────────────────────────────────────────

function toProductDTO(p: Record<string, unknown>): ProductDTO {
  const images = (p.images as string[]) ?? [];
  const categories = (p.categories as string[]) ?? [];
  const tags = (p.tags as string[]) ?? [];
  return {
    id: p.id as string,
    name: p.title as string,
    slug: p.slug as string,
    description: (p.description as string) ?? "",
    price: (p.price as number) ?? 0,
    currency: (p.currency as string) ?? "INR",
    imageUrl: images[0] ?? null,
    thumbnail: (p.thumbnail as string) ?? null,
    category: categories[0] ?? "",
    tags,
    status: p.status as ProductDTO["status"],
    visibility: p.visibility as ProductDTO["visibility"],
    inventory: (p.inventory as number) ?? 0,
    isActive: true,
    sortOrder: 0,
    createdAt: p.createdAt as string,
    updatedAt: p.updatedAt as string,
  };
}

function toGalleryDTO(g: Record<string, unknown>): GalleryDTO {
  const media = (g.media as Array<Record<string, unknown>>) ?? [];
  return {
    id: g.id as string,
    slug: g.slug as string,
    title: g.title as string,
    description: (g.description as string) ?? "",
    coverImage: g.coverImage as string | undefined,
    media: media.map((m) => ({
      id: m.id as string,
      type: m.type as "image" | "video",
      url: m.url as string,
      thumbnail: m.thumbnail as string | undefined,
      alt: (m.alt as string) ?? "",
      caption: m.caption as string | undefined,
      width: m.width as number | undefined,
      height: m.height as number | undefined,
      sortOrder: (m.sortOrder as number) ?? 0,
    })),
    mediaCount: media.length,
    displayMode: g.displayMode as GalleryDTO["displayMode"],
    status: g.status as GalleryDTO["status"],
    visibility: g.visibility as GalleryDTO["visibility"],
    categories: (g.categories as string[]) ?? [],
    tags: (g.tags as string[]) ?? [],
    sortOrder: (g.sortOrder as number) ?? 0,
    createdAt: g.createdAt as string,
    updatedAt: g.updatedAt as string,
  };
}

// ── COMMAND INTERFACE ────────────────────────────────────────────────────────

export interface ContentCommandService {
  createProduct(input: CreateProductDTO): Promise<ServiceResult<ProductDTO>>;
  updateProduct(id: string, input: UpdateProductDTO): Promise<ServiceResult<ProductDTO>>;
  deleteProduct(id: string): Promise<CommandResult>;
  publishProduct(id: string): Promise<ServiceResult<ProductDTO>>;
  archiveProduct(id: string): Promise<ServiceResult<ProductDTO>>;
  createGallery(input: CreateGalleryDTO): Promise<ServiceResult<GalleryDTO>>;
  addMediaToGallery(galleryId: string, media: GalleryMedia): Promise<ServiceResult<GalleryDTO>>;
  removeMediaFromGallery(galleryId: string, mediaId: string): Promise<CommandResult>;
  setGalleryCoverImage(galleryId: string, mediaId: string | null): Promise<ServiceResult<GalleryDTO>>;
  deleteGallery(id: string): Promise<CommandResult>;
}

// ── QUERY INTERFACE ──────────────────────────────────────────────────────────

export interface ContentQueryService {
  getProducts(tenantId: string): Promise<ServiceResult<ProductDTO[]>>;
  getProductStats(): Promise<ServiceResult<ProductStatsDTO>>;
  getGalleries(tenantId: string): Promise<ServiceResult<GalleryDTO[]>>;
}

// ── COMMAND IMPLEMENTATION ───────────────────────────────────────────────────

class ContentCommandServiceImpl extends BaseAppService implements ContentCommandService {
  constructor() {
    super("ContentCommandService");
  }

  async createProduct(input: CreateProductDTO): Promise<ServiceResult<ProductDTO>> {
    return this.wrapAsync(async () => {
      const product = await contentAPI.products.create({
        tenantId: input.tenantId,
        slug: input.slug,
        title: input.name,
        description: input.description,
        price: input.price,
        currency: input.currency,
        categories: input.categories,
        tags: input.tags,
        images: input.imageUrl ? [input.imageUrl] : [],
      });
      return toProductDTO(product as unknown as Record<string, unknown>);
    }, "Product");
  }

  async updateProduct(id: string, input: UpdateProductDTO): Promise<ServiceResult<ProductDTO>> {
    return this.wrapAsync(async () => {
      const updated = await contentAPI.products.update(id, input as Parameters<typeof contentAPI.products.update>[1]);
      if (!updated) throw new Error("Product not found");
      return toProductDTO(updated as unknown as Record<string, unknown>);
    }, "Product");
  }

  async deleteProduct(id: string): Promise<CommandResult> {
    return this.wrapCommand(async () => {
      const result = await contentAPI.products.delete(id);
      if (!result) throw new Error("Product not found");
    }, "Product");
  }

  async publishProduct(id: string): Promise<ServiceResult<ProductDTO>> {
    return this.wrapAsync(async () => {
      const updated = await contentAPI.products.publish(id);
      if (!updated) throw new Error("Product not found");
      return toProductDTO(updated as unknown as Record<string, unknown>);
    }, "Product");
  }

  async archiveProduct(id: string): Promise<ServiceResult<ProductDTO>> {
    return this.wrapAsync(async () => {
      const updated = await contentAPI.products.archive(id);
      if (!updated) throw new Error("Product not found");
      return toProductDTO(updated as unknown as Record<string, unknown>);
    }, "Product");
  }

  async createGallery(input: CreateGalleryDTO): Promise<ServiceResult<GalleryDTO>> {
    return this.wrapAsync(async () => {
      const gallery = await contentAPI.gallery.create(input);
      return toGalleryDTO(gallery as unknown as Record<string, unknown>);
    }, "Gallery");
  }

  async addMediaToGallery(galleryId: string, media: GalleryMedia): Promise<ServiceResult<GalleryDTO>> {
    return this.wrapAsync(async () => {
      const updated = await contentAPI.gallery.addMedia(galleryId, media);
      if (!updated) throw new Error("Gallery not found");
      return toGalleryDTO(updated as unknown as Record<string, unknown>);
    }, "Gallery");
  }

  async removeMediaFromGallery(galleryId: string, mediaId: string): Promise<CommandResult> {
    return this.wrapCommand(async () => {
      const result = await contentAPI.gallery.removeMedia(galleryId, mediaId);
      if (!result) throw new Error("Gallery not found");
    }, "Gallery");
  }

  async setGalleryCoverImage(galleryId: string, mediaId: string | null): Promise<ServiceResult<GalleryDTO>> {
    return this.wrapAsync(async () => {
      const updated = await contentAPI.gallery.setCoverImage(galleryId, mediaId);
      if (!updated) throw new Error("Gallery not found");
      return toGalleryDTO(updated as unknown as Record<string, unknown>);
    }, "Gallery");
  }

  async deleteGallery(id: string): Promise<CommandResult> {
    return this.wrapCommand(async () => {
      const result = await contentAPI.gallery.delete(id);
      if (!result) throw new Error("Gallery not found");
    }, "Gallery");
  }
}

// ── QUERY IMPLEMENTATION ─────────────────────────────────────────────────────

class ContentQueryServiceImpl extends BaseAppService implements ContentQueryService {
  constructor() {
    super("ContentQueryService");
  }

  async getProducts(tenantId: string): Promise<ServiceResult<ProductDTO[]>> {
    return this.wrapAsync(async () => {
      const products = await contentAPI.products.findByTenant(tenantId);
      return products.map((p) => toProductDTO(p as unknown as Record<string, unknown>));
    }, "Product");
  }

  async getProductStats(): Promise<ServiceResult<ProductStatsDTO>> {
    return this.wrapAsync(async () => {
      const diag = await contentAPI.products.diagnostics();
      return {
        total: diag.total,
        active: diag.published,
        draft: diag.draft,
        published: diag.published,
        archived: diag.archived,
      };
    }, "Product");
  }

  async getGalleries(tenantId: string): Promise<ServiceResult<GalleryDTO[]>> {
    return this.wrapAsync(async () => {
      const galleries = await contentAPI.gallery.findByTenant(tenantId);
      return galleries.map((g) => toGalleryDTO(g as unknown as Record<string, unknown>));
    }, "Gallery");
  }
}

// ── FACADE ───────────────────────────────────────────────────────────────────

export class ContentApplicationService extends BaseAppService {
  readonly commands: ContentCommandService;
  readonly queries: ContentQueryService;

  constructor() {
    super("ContentApplicationService");
    this.commands = new ContentCommandServiceImpl();
    this.queries = new ContentQueryServiceImpl();
  }

  // ── queries delegation ─────────────────────────────────────────────────

  getProducts(tenantId: string): Promise<ServiceResult<ProductDTO[]>> {
    return this.queries.getProducts(tenantId);
  }

  getProductStats(): Promise<ServiceResult<ProductStatsDTO>> {
    return this.queries.getProductStats();
  }

  getGalleries(tenantId: string): Promise<ServiceResult<GalleryDTO[]>> {
    return this.queries.getGalleries(tenantId);
  }

  // ── commands delegation ────────────────────────────────────────────────

  createProduct(input: CreateProductDTO): Promise<ServiceResult<ProductDTO>> {
    return this.commands.createProduct(input);
  }

  updateProduct(id: string, input: UpdateProductDTO): Promise<ServiceResult<ProductDTO>> {
    return this.commands.updateProduct(id, input);
  }

  deleteProduct(id: string): Promise<CommandResult> {
    return this.commands.deleteProduct(id);
  }

  publishProduct(id: string): Promise<ServiceResult<ProductDTO>> {
    return this.commands.publishProduct(id);
  }

  archiveProduct(id: string): Promise<ServiceResult<ProductDTO>> {
    return this.commands.archiveProduct(id);
  }

  createGallery(input: CreateGalleryDTO): Promise<ServiceResult<GalleryDTO>> {
    return this.commands.createGallery(input);
  }

  addMediaToGallery(galleryId: string, media: GalleryMedia): Promise<ServiceResult<GalleryDTO>> {
    return this.commands.addMediaToGallery(galleryId, media);
  }

  removeMediaFromGallery(galleryId: string, mediaId: string): Promise<CommandResult> {
    return this.commands.removeMediaFromGallery(galleryId, mediaId);
  }

  setGalleryCoverImage(galleryId: string, mediaId: string | null): Promise<ServiceResult<GalleryDTO>> {
    return this.commands.setGalleryCoverImage(galleryId, mediaId);
  }

  deleteGallery(id: string): Promise<CommandResult> {
    return this.commands.deleteGallery(id);
  }
}

export const contentAppService = new ContentApplicationService();
