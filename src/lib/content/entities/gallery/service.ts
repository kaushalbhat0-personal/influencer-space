import type { Gallery, GalleryMedia, CreateGalleryInput, GalleryDiagnostics } from "./types";
import type { IBaseRepository } from "../../framework/types";
import { galleryRepository } from "./repository";
import { BaseApplicationService } from "../../framework/base";
import type { LifecycleHooks } from "../../framework/types";
import { contentEvents } from "../../engine";

const VALID_DISPLAY_MODES = new Set(["grid", "masonry", "carousel", "slideshow", "list"]);
const VALID_MEDIA_TYPES = new Set(["image", "video"]);
const MAX_MEDIA_PER_GALLERY = 500;

export class GalleryApplicationService extends BaseApplicationService<Gallery> {
  constructor(repoOverride?: IBaseRepository<Gallery>) {
    const repo = repoOverride ?? galleryRepository;
    const lifecycle: LifecycleHooks<Gallery> = {
      validate: (entity: Gallery): string[] => {
        const errors: string[] = [];
        if (!entity.title) errors.push("Title is required");
        if (!entity.ownerId) errors.push("Owner ID is required");
        if (!VALID_DISPLAY_MODES.has(entity.displayMode))
          errors.push(`Invalid display mode: "${entity.displayMode}"`);
        if (entity.media.length > MAX_MEDIA_PER_GALLERY)
          errors.push(`Gallery cannot exceed ${MAX_MEDIA_PER_GALLERY} media items`);
        const mediaIds = new Set<string>();
        for (const m of entity.media) {
          if (!m.url) errors.push("Media URL is required");
          if (!VALID_MEDIA_TYPES.has(m.type))
            errors.push(`Invalid media type: "${m.type}" for media "${m.id}"`);
          if (mediaIds.has(m.id))
            errors.push(`Duplicate media ID: "${m.id}"`);
          mediaIds.add(m.id);
          if ((m.type === "video" && !m.thumbnail) || !m.alt)
            errors.push(`Media "${m.id}" is missing alt text`);
        }
        if (entity.coverImage && !entity.media.some((m) => m.id === entity.coverImage))
          errors.push(`Cover image "${entity.coverImage}" does not reference a valid media item`);
        return errors;
      },
      beforeUpdate: async (id: string, data: Partial<Gallery>): Promise<void> => {
        const existing = await repo.findById(id);
        if (!existing) throw new Error("Gallery not found");
        if (data.title !== undefined && !data.title) throw new Error("Title is required");
        if (data.displayMode && !VALID_DISPLAY_MODES.has(data.displayMode))
          throw new Error(`Invalid display mode: "${data.displayMode}"`);
        if (data.media && data.media.length > MAX_MEDIA_PER_GALLERY)
          throw new Error(`Gallery cannot exceed ${MAX_MEDIA_PER_GALLERY} media items`);
        if (data.coverImage !== undefined) {
          const targetMedia = data.media ?? existing.media;
          if (data.coverImage && !targetMedia.some((m) => m.id === data.coverImage))
            throw new Error(`Cover image "${data.coverImage}" does not reference a valid media item`);
        }
      },
      afterCreate: (entity) => {
        contentEvents.emit("gallery:created", {
          galleryId: entity.id,
          tenantId: entity.tenantId,
          ownerId: entity.ownerId,
          title: entity.title,
          mediaCount: entity.media.length,
        });
      },
      afterUpdate: (entity) => {
        contentEvents.emit("gallery:updated", { galleryId: entity.id });
      },
      afterDelete: (id) => {
        contentEvents.emit("gallery:deleted", { galleryId: id });
      },
    };
    super(repo, lifecycle);
  }

  async create(input: CreateGalleryInput): Promise<Gallery> {
    const existing = await this.repo.findBySlug(input.tenantId, input.slug);
    if (existing) throw new Error(`Slug "${input.slug}" is already taken`);

    const gallery: Gallery = {
      id: "",
      tenantId: input.tenantId,
      ownerId: input.ownerId,
      slug: input.slug,
      title: input.title,
      description: input.description ?? "",
      status: "draft",
      visibility: input.visibility ?? "public",
      displayMode: input.displayMode ?? "grid",
      sortOrder: input.sortOrder ?? 0,
      coverImage: input.coverImage,
      media: [],
      categories: input.categories ?? [],
      tags: input.tags ?? [],
      seo: {
        title: input.title,
        description: input.description ?? "",
        keywords: [],
      },
      metadata: {},
      version: 1,
      createdAt: "",
      updatedAt: "",
    };

    const errors = this.lifecycle.validate?.(gallery) ?? [];
    if (errors.length > 0) throw new Error(errors.join(", "));

    return super.create(gallery);
  }

  async publish(id: string): Promise<Gallery | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;
    if (existing.media.length === 0) throw new Error("Cannot publish gallery with no media items");

    const result = await this.repo.update(id, { status: "published" } as Partial<Gallery>);
    if (result) contentEvents.emit("gallery:published", { galleryId: id });
    return result;
  }

  async archive(id: string): Promise<Gallery | null> {
    const result = await this.repo.update(id, { status: "archived" } as Partial<Gallery>);
    if (result) contentEvents.emit("gallery:archived", { galleryId: id });
    return result;
  }

  async search(tenantId: string, term: string): Promise<Gallery[]> {
    return this.repo.query({ tenantId, search: term });
  }

  async addMedia(galleryId: string, media: GalleryMedia): Promise<Gallery | null> {
    const gallery = await this.repo.findById(galleryId);
    if (!gallery) throw new Error("Gallery not found");
    if (gallery.media.length >= MAX_MEDIA_PER_GALLERY)
      throw new Error(`Gallery cannot exceed ${MAX_MEDIA_PER_GALLERY} media items`);
    if (gallery.media.some((m) => m.id === media.id))
      throw new Error(`Duplicate media ID: "${media.id}"`);

    const updated = await this.repo.update(galleryId, {
      media: [...gallery.media, media],
    } as Partial<Gallery>);

    if (updated) {
      contentEvents.emit("gallery:mediaAdded", {
        galleryId,
        mediaId: media.id,
        mediaCount: updated.media.length,
      });
    }
    return updated;
  }

  async removeMedia(galleryId: string, mediaId: string): Promise<Gallery | null> {
    const gallery = await this.repo.findById(galleryId);
    if (!gallery) throw new Error("Gallery not found");
    if (gallery.media.length <= 1)
      throw new Error("Cannot remove last media item from gallery");

    const updated = await this.repo.update(galleryId, {
      media: gallery.media.filter((m) => m.id !== mediaId),
      coverImage: gallery.coverImage === mediaId ? undefined : gallery.coverImage,
    } as Partial<Gallery>);

    if (updated) {
      contentEvents.emit("gallery:mediaRemoved", {
        galleryId,
        mediaId,
        mediaCount: updated.media.length,
      });
    }
    return updated;
  }

  async reorderMedia(
    galleryId: string,
    orderedIds: string[]
  ): Promise<Gallery | null> {
    const gallery = await this.repo.findById(galleryId);
    if (!gallery) throw new Error("Gallery not found");

    const mediaMap = new Map(gallery.media.map((m) => [m.id, m]));
    const reordered: GalleryMedia[] = [];
    for (const id of orderedIds) {
      const m = mediaMap.get(id);
      if (!m) throw new Error(`Media "${id}" not found in gallery`);
      reordered.push({ ...m, sortOrder: reordered.length });
    }

    const updated = await this.repo.update(galleryId, {
      media: reordered,
    } as Partial<Gallery>);

    if (updated) {
      contentEvents.emit("gallery:mediaReordered", {
        galleryId,
        order: orderedIds,
      });
    }
    return updated;
  }

  async setCoverImage(galleryId: string, mediaId: string | null): Promise<Gallery | null> {
    const gallery = await this.repo.findById(galleryId);
    if (!gallery) throw new Error("Gallery not found");
    if (mediaId && !gallery.media.some((m) => m.id === mediaId))
      throw new Error(`Cover image "${mediaId}" does not reference a valid media item`);

    const updated = await this.repo.update(galleryId, {
      coverImage: mediaId ?? undefined,
    } as Partial<Gallery>);

    if (updated) {
      contentEvents.emit("gallery:coverChanged", {
        galleryId,
        coverImage: mediaId,
      });
    }
    return updated;
  }

  async getDetailedDiagnostics(): Promise<GalleryDiagnostics> {
    const all = await this.repo.query({});
    const base = await this.diagnostics();

    const totalMedia = all.reduce((sum, g) => sum + g.media.length, 0);
    const missingAltText: string[] = [];
    const seenMedia = new Map<string, string[]>();

    for (const g of all) {
      for (const m of g.media) {
        if (!m.alt) missingAltText.push(`${g.id}::${m.id}`);
        const entries = seenMedia.get(m.url) ?? [];
        entries.push(`${g.id}::${m.id}`);
        seenMedia.set(m.url, entries);
      }
    }

    const duplicateMedia: string[] = [];
    for (const [url, entries] of Array.from(seenMedia.entries())) {
      if (entries.length > 1) duplicateMedia.push(url);
    }

    return {
      ...base,
      totalMedia,
      averageMediaPerGallery: all.length > 0 ? Math.round(totalMedia / all.length) : 0,
      missingAltText,
      duplicateMedia,
      validationErrors: [],
    };
  }
}

export const galleryService = new GalleryApplicationService();
