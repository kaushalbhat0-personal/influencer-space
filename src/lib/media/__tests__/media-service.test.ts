import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockEnforceStorageLimit, mockProvider } = vi.hoisted(() => ({
  mockEnforceStorageLimit: vi.fn(),
  mockProvider: {
    exists: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
    getPublicUrl: vi.fn(),
    createSignedUploadUrl: vi.fn(),
    supportsSignedUpload: true,
    name: "mock",
  },
}));

vi.mock("@/modules/billing/application/storage.enforcement", () => ({
  enforceStorageLimit: mockEnforceStorageLimit,
}));

vi.mock("../repositories/asset-repository", () => ({
  assetRepository: { findDuplicates: vi.fn().mockResolvedValue([]) },
}));

vi.mock("../providers/factory", () => ({
  storageProviderFactory: { getProvider: () => mockProvider },
}));

vi.mock("@/lib/events", () => ({
  platformEventBus: { publish: vi.fn() },
}));

vi.mock("../processing/image-processor", () => ({
  imageProcessor: { extractMetadata: vi.fn(), generateBlurHash: vi.fn(), generateDominantColor: vi.fn() },
}));

import { mediaService, MediaValidationError } from "../service";

function makeFile(size: number) {
  return {
    filename: "photo.jpg",
    mimeType: "image/jpeg",
    size,
    buffer: Buffer.alloc(size > 0 ? 16 : 0),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnforceStorageLimit.mockReset();
});

describe("MediaService storage quota wiring (RCCF-09)", () => {
  it("rejects an upload that exceeds the tenant storage quota", async () => {
    mockEnforceStorageLimit.mockResolvedValue({
      ok: false,
      used: 1024,
      limit: 1024,
      remaining: 0,
      limitGb: 1,
      reason: "Storage limit reached (1.2 / 1 GB).",
    });

    const error = await mediaService.upload({ tenantId: "t1", file: makeFile(2048) }).then(() => null).catch((e) => e);

    expect(error).toBeInstanceOf(MediaValidationError);
    expect((error as Error).message).toContain("Storage limit reached");
  });

  it("blocks a signed upload at the prepare step when over quota", async () => {
    mockEnforceStorageLimit.mockResolvedValue({
      ok: false,
      used: 1024,
      limit: 1024,
      remaining: 0,
      limitGb: 1,
      reason: "Storage limit reached (1.1 / 1 GB).",
    });

    await expect(
      mediaService.prepareSignedUpload({
        tenantId: "t1",
        filename: "a.mp4",
        mimeType: "video/mp4",
        size: 2048,
        checksum: "c1",
      }),
    ).rejects.toThrow("Storage limit reached");
  });

  it("blocks the authoritative register step when over quota", async () => {
    mockEnforceStorageLimit.mockResolvedValue({
      ok: false,
      used: 1024,
      limit: 1024,
      remaining: 0,
      limitGb: 1,
      reason: "Storage limit reached (1.5 / 1 GB).",
    });
    mockProvider.exists.mockResolvedValue(true);

    await expect(
      mediaService.completeSignedUpload({
        tenantId: "t1",
        storageKey: "t1/general/x.mp4",
        publicUrl: "https://x",
        filename: "x.mp4",
        originalFilename: "x.mp4",
        mimeType: "video/mp4",
        size: 2048,
        checksum: "c1",
      }),
    ).rejects.toThrow("Storage limit reached");
  });
});