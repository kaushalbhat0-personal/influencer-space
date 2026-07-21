import { describe, it, expect, beforeEach } from "vitest";
import { GalleryApplicationService } from "@/lib/content/entities/gallery/service";
import { InMemoryGalleryRepository } from "@/lib/content/entities/gallery/repository";
import type { CreateGalleryInput, GalleryMedia } from "@/lib/content/entities/gallery/types";
import { contentEvents } from "@/lib/content/engine";
import { contentAPI } from "@/lib/content/api";

function makeMedia(overrides?: Partial<GalleryMedia>): GalleryMedia {
  const id = overrides?.id ?? `media-${Date.now()}-${Math.random()}`;
  return {
    id,
    type: "image",
    url: `https://example.com/${id}.jpg`,
    thumbnail: `https://example.com/${id}_thumb.jpg`,
    alt: `${id} alt text`,
    caption: `${id} caption`,
    width: 1920,
    height: 1080,
    size: 102400,
    mimeType: "image/jpeg",
    sortOrder: 0,
    visibility: "public",
    metadata: {},
    ...overrides,
  };
}

const input: CreateGalleryInput = {
  tenantId: "t1",
  ownerId: "user-1",
  slug: "my-portfolio",
  title: "My Portfolio",
  description: "A collection of my best work",
  visibility: "public",
  displayMode: "grid",
  sortOrder: 0,
  categories: ["photography", "portrait"],
  tags: ["creative", "best"],
};

describe("GalleryModule", () => {
  let service: GalleryApplicationService;
  let repo: InMemoryGalleryRepository;

  beforeEach(() => {
    repo = new InMemoryGalleryRepository();
    service = new GalleryApplicationService(repo);
  });

  describe("Gallery Entity", () => {
    it("should create a gallery with all fields", async () => {
      const gallery = await service.create(input);
      expect(gallery.title).toBe("My Portfolio");
      expect(gallery.ownerId).toBe("user-1");
      expect(gallery.status).toBe("draft");
      expect(gallery.visibility).toBe("public");
      expect(gallery.displayMode).toBe("grid");
      expect(gallery.sortOrder).toBe(0);
      expect(gallery.categories).toEqual(["photography", "portrait"]);
      expect(gallery.media).toEqual([]);
      expect(gallery.seo.title).toBe("My Portfolio");
    });

    it("should generate ID, createdAt, updatedAt", async () => {
      const gallery = await service.create(input);
      expect(gallery.id).toBeTruthy();
      expect(gallery.createdAt).toBeTruthy();
      expect(gallery.updatedAt).toBeTruthy();
      expect(gallery.version).toBe(1);
    });

    it("should default displayMode to grid", async () => {
      const { displayMode, ...rest } = input;
      const gallery = await service.create(rest);
      expect(gallery.displayMode).toBe("grid");
    });

    it("should default visibility to public", async () => {
      const { visibility, ...rest } = input;
      const gallery = await service.create(rest);
      expect(gallery.visibility).toBe("public");
    });

    it("should require title", async () => {
      await expect(
        service.create({ ...input, title: "" })
      ).rejects.toThrow("Title is required");
    });

    it("should require ownerId", async () => {
      await expect(
        service.create({ ...input, ownerId: "" })
      ).rejects.toThrow("Owner ID is required");
    });

    it("should reject invalid display mode", async () => {
      await expect(
        service.create({ ...input, displayMode: "invalid" as never })
      ).rejects.toThrow("Invalid display mode");
    });
  });

  describe("Repository", () => {
    it("should find by slug per tenant", async () => {
      await service.create(input);
      const found = await service.findBySlug("t1", "my-portfolio");
      expect(found!.title).toBe("My Portfolio");
    });

    it("should return null for unknown slug", async () => {
      const found = await service.findBySlug("t1", "nonexistent");
      expect(found).toBeNull();
    });

    it("should enforce unique slugs per tenant", async () => {
      await service.create(input);
      await expect(service.create(input)).rejects.toThrow("already taken");
    });

    it("should allow same slug across different tenants", async () => {
      await service.create(input);
      const gallery2 = await service.create({ ...input, tenantId: "t2" });
      expect(gallery2.slug).toBe("my-portfolio");
    });

    it("should delete a gallery", async () => {
      const gallery = await service.create(input);
      const deleted = await service.delete(gallery.id);
      expect(deleted).toBe(true);
      expect(await service.findById(gallery.id)).toBeNull();
    });

    it("should update a gallery", async () => {
      const gallery = await service.create(input);
      const updated = await service.update(gallery.id, {
        title: "Updated Portfolio",
        description: "New description",
      });
      expect(updated!.title).toBe("Updated Portfolio");
      expect(updated!.description).toBe("New description");
      expect(updated!.version).toBe(2);
    });
  });

  describe("Lifecycle & Status", () => {
    it("should publish a gallery", async () => {
      const gallery = await service.create(input);
      const m = makeMedia({ id: "pub-media" });
      await service.addMedia(gallery.id, m);
      const published = await service.publish(gallery.id);
      expect(published!.status).toBe("published");
    });

    it("should archive a gallery", async () => {
      const gallery = await service.create(input);
      const archived = await service.archive(gallery.id);
      expect(archived!.status).toBe("archived");
    });

    it("should not publish gallery with no media", async () => {
      const gallery = await service.create(input);
      await expect(service.publish(gallery.id)).rejects.toThrow(
        "Cannot publish gallery with no media items"
      );
    });

    it("should query by tenant", async () => {
      await service.create(input);
      await service.create({ ...input, slug: "collection-2", title: "Collection 2" });
      const results = await service.findByTenant("t1");
      expect(results.length).toBe(2);
    });

    it("should search galleries", async () => {
      await service.create(input);
      const results = await service.search("t1", "Portfolio");
      expect(results.length).toBe(1);
      expect(results[0]!.title).toBe("My Portfolio");
    });
  });

  describe("Validation", () => {
    it("should validate media IDs are unique", async () => {
      const gallery = await service.create(input);
      const m = makeMedia({ id: "media-1" });
      await service.addMedia(gallery.id, m);
      await expect(service.addMedia(gallery.id, m)).rejects.toThrow(
        "Duplicate media ID"
      );
    });

    it("should validate cover image references valid media", async () => {
      const gallery = await service.create(input);
      await expect(
        service.setCoverImage(gallery.id, "nonexistent-media")
      ).rejects.toThrow("does not reference a valid media item");
    });

    it("should reject empty title on update", async () => {
      const gallery = await service.create(input);
      await expect(
        service.update(gallery.id, { title: "" })
      ).rejects.toThrow();
    });
  });

  describe("Events", () => {
    it("should emit gallery:created on create", async () => {
      let emitted: Record<string, unknown> | null = null;
      contentEvents.on("gallery:created", (payload) => { emitted = payload; });
      const gallery = await service.create(input);
      expect(emitted).toBeTruthy();
      expect(emitted!.galleryId).toBe(gallery.id);
      expect(emitted!.tenantId).toBe("t1");
      expect(emitted!.title).toBe("My Portfolio");
    });

    it("should emit gallery:updated on update", async () => {
      let emitted: Record<string, unknown> | null = null;
      contentEvents.on("gallery:updated", (payload) => { emitted = payload; });
      const gallery = await service.create(input);
      await service.update(gallery.id, { title: "New Title" });
      expect(emitted).toBeTruthy();
      expect(emitted!.galleryId).toBe(gallery.id);
    });

    it("should emit gallery:published on publish", async () => {
      let emitted: Record<string, unknown> | null = null;
      contentEvents.on("gallery:published", (payload) => { emitted = payload; });
      const gallery = await service.create(input);
      const m = makeMedia({ id: "media-1" });
      await service.addMedia(gallery.id, m);
      await service.publish(gallery.id);
      expect(emitted).toBeTruthy();
      expect(emitted!.galleryId).toBe(gallery.id);
    });

    it("should emit gallery:archived on archive", async () => {
      let emitted: Record<string, unknown> | null = null;
      contentEvents.on("gallery:archived", (payload) => { emitted = payload; });
      const gallery = await service.create(input);
      await service.archive(gallery.id);
      expect(emitted).toBeTruthy();
      expect(emitted!.galleryId).toBe(gallery.id);
    });

    it("should emit gallery:deleted on delete", async () => {
      let emitted: Record<string, unknown> | null = null;
      contentEvents.on("gallery:deleted", (payload) => { emitted = payload; });
      const gallery = await service.create(input);
      await service.delete(gallery.id);
      expect(emitted).toBeTruthy();
      expect(emitted!.galleryId).toBe(gallery.id);
    });

    it("should emit gallery:mediaAdded on addMedia", async () => {
      let emitted: Record<string, unknown> | null = null;
      contentEvents.on("gallery:mediaAdded", (payload) => { emitted = payload; });
      const gallery = await service.create(input);
      const m = makeMedia({ id: "media-1" });
      await service.addMedia(gallery.id, m);
      expect(emitted).toBeTruthy();
      expect(emitted!.galleryId).toBe(gallery.id);
      expect(emitted!.mediaId).toBe("media-1");
      expect(emitted!.mediaCount).toBe(1);
    });

    it("should emit gallery:mediaRemoved on removeMedia", async () => {
      let emitted: Record<string, unknown> | null = null;
      contentEvents.on("gallery:mediaRemoved", (payload) => { emitted = payload; });
      const gallery = await service.create(input);
      const m1 = makeMedia({ id: "media-1" });
      const m2 = makeMedia({ id: "media-2" });
      await service.addMedia(gallery.id, m1);
      await service.addMedia(gallery.id, m2);
      await service.removeMedia(gallery.id, "media-1");
      expect(emitted).toBeTruthy();
      expect(emitted!.galleryId).toBe(gallery.id);
      expect(emitted!.mediaId).toBe("media-1");
    });

    it("should emit gallery:mediaReordered on reorder", async () => {
      let emitted: Record<string, unknown> | null = null;
      contentEvents.on("gallery:mediaReordered", (payload) => { emitted = payload; });
      const gallery = await service.create(input);
      const m1 = makeMedia({ id: "media-1" });
      const m2 = makeMedia({ id: "media-2" });
      await service.addMedia(gallery.id, m1);
      await service.addMedia(gallery.id, m2);
      await service.reorderMedia(gallery.id, ["media-2", "media-1"]);
      expect(emitted).toBeTruthy();
      expect(emitted!.galleryId).toBe(gallery.id);
      expect(emitted!.order).toEqual(["media-2", "media-1"]);
    });

    it("should emit gallery:coverChanged on setCoverImage", async () => {
      let emitted: Record<string, unknown> | null = null;
      contentEvents.on("gallery:coverChanged", (payload) => { emitted = payload; });
      const gallery = await service.create(input);
      const m = makeMedia({ id: "media-1" });
      await service.addMedia(gallery.id, m);
      await service.setCoverImage(gallery.id, "media-1");
      expect(emitted).toBeTruthy();
      expect(emitted!.galleryId).toBe(gallery.id);
      expect(emitted!.coverImage).toBe("media-1");
    });
  });

  describe("Media Operations", () => {
    it("should add media to a gallery", async () => {
      const gallery = await service.create(input);
      const m = makeMedia({ id: "media-1" });
      const updated = await service.addMedia(gallery.id, m);
      expect(updated!.media.length).toBe(1);
      expect(updated!.media[0]!.id).toBe("media-1");
    });

    it("should remove media from a gallery", async () => {
      const gallery = await service.create(input);
      const m1 = makeMedia({ id: "media-1" });
      const m2 = makeMedia({ id: "media-2" });
      await service.addMedia(gallery.id, m1);
      await service.addMedia(gallery.id, m2);
      const updated = await service.removeMedia(gallery.id, "media-1");
      expect(updated!.media.length).toBe(1);
      expect(updated!.media[0]!.id).toBe("media-2");
    });

    it("should not allow removing last media item", async () => {
      const gallery = await service.create(input);
      const m = makeMedia({ id: "media-1" });
      await service.addMedia(gallery.id, m);
      await expect(service.removeMedia(gallery.id, "media-1")).rejects.toThrow(
        "Cannot remove last media item"
      );
    });

    it("should reorder media items", async () => {
      const gallery = await service.create(input);
      const m1 = makeMedia({ id: "media-1" });
      const m2 = makeMedia({ id: "media-2" });
      const m3 = makeMedia({ id: "media-3" });
      await service.addMedia(gallery.id, m1);
      await service.addMedia(gallery.id, m2);
      await service.addMedia(gallery.id, m3);
      const updated = await service.reorderMedia(gallery.id, ["media-3", "media-1", "media-2"]);
      expect(updated!.media[0]!.id).toBe("media-3");
      expect(updated!.media[1]!.id).toBe("media-1");
      expect(updated!.media[2]!.id).toBe("media-2");
      expect(updated!.media[0]!.sortOrder).toBe(0);
      expect(updated!.media[1]!.sortOrder).toBe(1);
      expect(updated!.media[2]!.sortOrder).toBe(2);
    });

    it("should set cover image", async () => {
      const gallery = await service.create(input);
      const m = makeMedia({ id: "media-1" });
      await service.addMedia(gallery.id, m);
      const updated = await service.setCoverImage(gallery.id, "media-1");
      expect(updated!.coverImage).toBe("media-1");
    });

    it("should clear cover image", async () => {
      const gallery = await service.create(input);
      const m = makeMedia({ id: "media-1" });
      await service.addMedia(gallery.id, m);
      await service.setCoverImage(gallery.id, "media-1");
      const updated = await service.setCoverImage(gallery.id, null);
      expect(updated!.coverImage).toBeUndefined();
    });

    it("should clear cover image when media is removed", async () => {
      const gallery = await service.create(input);
      const m1 = makeMedia({ id: "media-1" });
      const m2 = makeMedia({ id: "media-2" });
      await service.addMedia(gallery.id, m1);
      await service.addMedia(gallery.id, m2);
      await service.setCoverImage(gallery.id, "media-1");
      const updated = await service.removeMedia(gallery.id, "media-1");
      expect(updated!.coverImage).toBeUndefined();
    });
  });

  describe("Manifest & Registration", () => {
    it("should have registered gallery module in ContentAPI", () => {
      const modules = contentAPI.listModules();
      const gallery = modules.find((m) => m.id === "com.creatos.gallery");
      expect(gallery).toBeTruthy();
      expect(gallery!.name).toBe("gallery");
      expect(gallery!.version).toBe("1.0.0");
      expect(gallery!.category).toBe("content");
      expect(gallery!.capabilities.creatable).toBe(true);
      expect(gallery!.capabilities.searchable).toBe(true);
    });

    it("should have gallery accessible via platform.content.gallery", () => {
      expect(contentAPI.gallery).toBeTruthy();
      expect(contentAPI.gallery.manifest.id).toBe("com.creatos.gallery");
    });

    it("should have gallery API with full operation set", () => {
      const api = contentAPI.gallery;
      expect(api.create).toBeInstanceOf(Function);
      expect(api.update).toBeInstanceOf(Function);
      expect(api.delete).toBeInstanceOf(Function);
      expect(api.publish).toBeInstanceOf(Function);
      expect(api.archive).toBeInstanceOf(Function);
      expect(api.findById).toBeInstanceOf(Function);
      expect(api.findBySlug).toBeInstanceOf(Function);
      expect(api.findByTenant).toBeInstanceOf(Function);
      expect(api.query).toBeInstanceOf(Function);
      expect(api.search).toBeInstanceOf(Function);
      expect(api.addMedia).toBeInstanceOf(Function);
      expect(api.removeMedia).toBeInstanceOf(Function);
      expect(api.reorderMedia).toBeInstanceOf(Function);
      expect(api.setCoverImage).toBeInstanceOf(Function);
      expect(api.diagnostics).toBeInstanceOf(Function);
    });

    it("should perform create via platform.content.gallery", async () => {
      const gallery = await contentAPI.gallery.create({
        ...input,
        slug: "platform-test",
      });
      expect(gallery.title).toBe("My Portfolio");
      expect(gallery.status).toBe("draft");
    });

    it("should perform addMedia via platform.content.gallery", async () => {
      const gallery = await contentAPI.gallery.create({
        ...input,
        slug: "platform-media-test",
      });
      const m = makeMedia({ id: "pm-1" });
      const updated = await contentAPI.gallery.addMedia(gallery.id, m);
      expect(updated!.media.length).toBe(1);
    });

    it("should resolve via ContentAPI", () => {
      const resolved = contentAPI.resolve("com.creatos.gallery");
      expect(resolved).toBeTruthy();
      expect(resolved!.manifest.id).toBe("com.creatos.gallery");
    });
  });

  describe("Diagnostics", () => {
    it("should return correct diagnostics for empty repository", async () => {
      const diag = await service.getDetailedDiagnostics();
      expect(diag.total).toBe(0);
      expect(diag.totalMedia).toBe(0);
      expect(diag.averageMediaPerGallery).toBe(0);
    });

    it("should return correct diagnostics with data", async () => {
      const g1 = await service.create(input);
      const m = makeMedia({ id: "d-1", alt: "test" });
      await service.addMedia(g1.id, m);

      const diag = await service.getDetailedDiagnostics();
      expect(diag.total).toBe(1);
      expect(diag.draft).toBe(1);
      expect(diag.totalMedia).toBe(1);
      expect(diag.averageMediaPerGallery).toBe(1);
    });

    it("should detect missing alt text", async () => {
      const gallery = await service.create(input);
      const m = makeMedia({ id: "d-noalt", alt: "" });
      await service.addMedia(gallery.id, m);

      const diag = await service.getDetailedDiagnostics();
      expect(diag.missingAltText.length).toBe(1);
      expect(diag.missingAltText[0]).toContain("d-noalt");
    });

    it("should detect duplicate media URLs", async () => {
      const g1 = await service.create(input);
      const g2 = await service.create({ ...input, slug: "gallery-2" });
      const m = makeMedia({ id: "dup-1", url: "https://example.com/same.jpg" });
      await service.addMedia(g1.id, m);
      await service.addMedia(g2.id, { ...m, id: "dup-2" });

      const diag = await service.getDetailedDiagnostics();
      expect(diag.duplicateMedia.length).toBe(1);
      expect(diag.duplicateMedia[0]).toBe("https://example.com/same.jpg");
    });
  });
});
