import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGalleryFindMany, mockGalleryCreate, mockGalleryDelete } = vi.hoisted(() => ({
  mockGalleryFindMany: vi.fn(),
  mockGalleryCreate: vi.fn(),
  mockGalleryDelete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    galleryImage: {
      findMany: mockGalleryFindMany,
      create: mockGalleryCreate,
      delete: mockGalleryDelete,
    },
  },
}));

import { galleryService } from "../service";
import { galleryFormSchema } from "../validators";

beforeEach(() => { vi.clearAllMocks(); });

describe("Gallery validators", () => {
  it("accepts valid gallery item", () => {
    const result = galleryFormSchema.safeParse({ title: "Photo", imageUrl: "https://example.com/photo.jpg" });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = galleryFormSchema.safeParse({ imageUrl: "https://example.com/photo.jpg" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid image url", () => {
    const result = galleryFormSchema.safeParse({ title: "Photo", imageUrl: "not-url" });
    expect(result.success).toBe(false);
  });
});

describe("Gallery service", () => {
  it("list returns items", async () => {
    mockGalleryFindMany.mockResolvedValue([
      { id: "1", title: "Photo", description: null, imageUrl: "https://example.com/1.jpg", mediaType: "image", videoUrl: null, altText: null, category: "general", tags: "", isFeatured: false, order: 0, isActive: true, status: "PUBLISHED", fileSize: null, width: null, height: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date(), tenantId: "t1" },
    ]);
    const result = await galleryService.list("t1");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Photo");
  });

  it("create creates item", async () => {
    mockGalleryCreate.mockResolvedValue({ id: "1", title: "New", description: null, imageUrl: "https://example.com/1.jpg", mediaType: "image", videoUrl: null, altText: null, category: "general", tags: "", isFeatured: false, order: 0, isActive: true, status: "PUBLISHED", fileSize: null, width: null, height: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date(), tenantId: "t1" });
    const result = await galleryService.create("t1", { title: "New", imageUrl: "https://example.com/1.jpg" });
    expect(result.title).toBe("New");
  });

  it("delete removes item", async () => {
    mockGalleryDelete.mockResolvedValue({});
    await galleryService.delete("1");
    expect(mockGalleryDelete).toHaveBeenCalledWith({ where: { id: "1" } });
  });
});
