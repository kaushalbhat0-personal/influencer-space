import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockEnforceStorageLimit, mockProvider, mockFindDuplicates, mockCreateAsset, mockUpdateAsset, mockCreateReference } = vi.hoisted(() => ({
  mockEnforceStorageLimit: vi.fn(),
  mockProvider: {
    exists: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
    getPublicUrl: vi.fn(),
    createSignedUploadUrl: vi.fn(),
    getObjectMetadata: vi.fn(),
    supportsSignedUpload: true,
    name: "mock",
  },
  mockFindDuplicates: vi.fn(),
  mockCreateAsset: vi.fn(),
  mockUpdateAsset: vi.fn(),
  mockCreateReference: vi.fn(),
}));

vi.mock("@/modules/billing/application/storage.enforcement", () => ({
  enforceStorageLimit: mockEnforceStorageLimit,
}));

vi.mock("../repositories/asset-repository", () => ({
  assetRepository: {
    findDuplicates: mockFindDuplicates,
    create: mockCreateAsset,
    update: mockUpdateAsset,
    createReference: mockCreateReference,
  },
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

function signedPayload(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: "t1",
    storageKey: "t1/general/x.mp4",
    publicUrl: "https://x",
    filename: "x.mp4",
    originalFilename: "x.mp4",
    mimeType: "video/mp4",
    size: 2048,
    checksum: "c1",
    ...overrides,
  };
}

const OK_QUOTA = { ok: true, used: 0, limit: 999999, remaining: 999999, limitGb: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  mockEnforceStorageLimit.mockReset();
  mockFindDuplicates.mockReset();
  mockFindDuplicates.mockResolvedValue([]);
  mockCreateAsset.mockReset();
  mockCreateAsset.mockResolvedValue({ id: "asset-1", publicUrl: "https://x", tenantId: "t1" });
  mockUpdateAsset.mockReset();
  mockUpdateAsset.mockResolvedValue({});
  mockCreateReference.mockReset();
  mockCreateReference.mockResolvedValue({});
  mockProvider.exists.mockReset();
  mockProvider.exists.mockResolvedValue(true);
  mockProvider.getObjectMetadata.mockReset();
  mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048 });
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

    await expect(mediaService.completeSignedUpload(signedPayload())).rejects.toThrow("Storage limit reached");
  });
});

describe("MediaService signed-upload authoritative size (RCCF-19 P1-S)", () => {
  it("uses the provider-reported size for quota when the client declares smaller", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 50 * 1024 * 1024 });

    await mediaService.completeSignedUpload(signedPayload({ size: 1 }));

    expect(mockEnforceStorageLimit).toHaveBeenCalledWith({ tenantId: "t1", incomingBytes: 50 * 1024 * 1024 });
    expect(mockCreateAsset).toHaveBeenCalledWith(expect.objectContaining({ size: 50 * 1024 * 1024 }));
  });

  it("uses the provider-reported size when the client declares larger", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048 });

    await mediaService.completeSignedUpload(signedPayload({ size: 999 * 1024 * 1024 }));

    expect(mockEnforceStorageLimit).toHaveBeenCalledWith({ tenantId: "t1", incomingBytes: 2048 });
    expect(mockCreateAsset).toHaveBeenCalledWith(expect.objectContaining({ size: 2048 }));
  });

  it("rejects when the actual object exceeds the per-category file limit", async () => {
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 600 * 1024 * 1024 });

    await expect(mediaService.completeSignedUpload(signedPayload({ size: 1 }))).rejects.toThrow(MediaValidationError);
    expect(mockCreateAsset).not.toHaveBeenCalled();
  });

  it("rejects when the provider object is missing", async () => {
    mockProvider.exists.mockResolvedValue(false);

    await expect(mediaService.completeSignedUpload(signedPayload())).rejects.toThrow("not found");
    expect(mockCreateAsset).not.toHaveBeenCalled();
  });

  it("fails closed when provider metadata is unavailable", async () => {
    mockProvider.getObjectMetadata.mockRejectedValue(new Error("metadata failed"));

    await expect(mediaService.completeSignedUpload(signedPayload())).rejects.toThrow("metadata failed");
    expect(mockCreateAsset).not.toHaveBeenCalled();
  });

  it("fails closed when the provider does not support object verification", async () => {
    mockProvider.getObjectMetadata = undefined as never;

    await expect(mediaService.completeSignedUpload(signedPayload())).rejects.toThrow("does not support object verification");
    expect(mockCreateAsset).not.toHaveBeenCalled();

    mockProvider.getObjectMetadata = vi.fn().mockResolvedValue({ size: 2048 });
  });

  it("registers a valid object with the provider-reported size", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048 });

    const result = await mediaService.completeSignedUpload(signedPayload({ size: 1 }));

    expect(result.deduplicated).toBe(false);
    expect(mockCreateAsset).toHaveBeenCalledWith(expect.objectContaining({ size: 2048 }));
  });

  it("dedupes a duplicate at the register step without double-counting storage", async () => {
    mockFindDuplicates.mockResolvedValue([{ id: "existing-1", publicUrl: "https://e" }]);
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);

    const result = await mediaService.completeSignedUpload(signedPayload({ checksum: "dup" }));

    expect(result.deduplicated).toBe(true);
    expect(mockCreateAsset).not.toHaveBeenCalled();
    expect(mockEnforceStorageLimit).not.toHaveBeenCalled();
  });
});