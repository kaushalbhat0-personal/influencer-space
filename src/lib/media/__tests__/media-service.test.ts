import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockEnforceStorageLimit, mockResolveHeroVideoCapability, mockResolveStorageLimitBytes, mockStorageBytesToMb, mockCountStorageUsage, mockProvider, mockFindDuplicates, mockCreateAsset, mockUpdateAsset, mockCreateReference, mockFindById } = vi.hoisted(() => ({
  mockEnforceStorageLimit: vi.fn(),
  mockResolveHeroVideoCapability: vi.fn(),
  mockResolveStorageLimitBytes: vi.fn(),
  mockStorageBytesToMb: vi.fn(),
  mockCountStorageUsage: vi.fn(),
  mockProvider: {
    exists: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
    getPublicUrl: vi.fn(),
    createSignedUploadUrl: vi.fn(),
    getObjectMetadata: vi.fn(),
    readRange: vi.fn(),
    supportsSignedUpload: true,
    name: "mock",
  },
  mockFindDuplicates: vi.fn(),
  mockCreateAsset: vi.fn(),
  mockUpdateAsset: vi.fn(),
  mockCreateReference: vi.fn(),
  mockFindById: vi.fn(),
}));

vi.mock("@/modules/billing/application/storage.enforcement", () => ({
  enforceStorageLimit: mockEnforceStorageLimit,
  resolveHeroVideoCapability: mockResolveHeroVideoCapability,
  resolveStorageLimitBytes: mockResolveStorageLimitBytes,
  storageBytesToMb: mockStorageBytesToMb,
  countStorageUsage: mockCountStorageUsage,
}));

// RCCF-59: the authoritative quota gate runs in a $transaction with a tenant
// row lock; the tx stub mirrors prisma's transaction surface for the tests.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (cb: (tx: unknown) => unknown) => cb({
      $queryRaw: async () => {},
      asset: { aggregate: async () => ({ _sum: { size: 0 } }) },
    }),
  },
}));

// Plan resolution is resolved to a fixed active plan so resolvePlanCode does
// not hit a real DB in unit tests.
vi.mock("@/modules/billing/application/plan-source", () => ({
  resolveActivePlan: async () => ({ code: "creator_scale", origin: "v2", status: "active" }),
}));
vi.mock("@/modules/billing/application/runtime-config-loader", () => ({
  loadRuntimeFeatureOverrides: async () => {},
}));

vi.mock("../repositories/asset-repository", () => ({
  assetRepository: {
    findDuplicates: mockFindDuplicates,
    create: mockCreateAsset,
    update: mockUpdateAsset,
    createReference: mockCreateReference,
    findById: mockFindById,
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
  mockResolveHeroVideoCapability.mockReset();
  mockResolveHeroVideoCapability.mockReturnValue({ enabled: false, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
  mockResolveStorageLimitBytes.mockReset();
  mockResolveStorageLimitBytes.mockReturnValue(999999 * 1024 * 1024);
  mockStorageBytesToMb.mockReset();
  mockStorageBytesToMb.mockImplementation((b: number) => b / (1024 * 1024));
  mockCountStorageUsage.mockReset();
  mockCountStorageUsage.mockResolvedValue(0);
  mockFindDuplicates.mockReset();
  mockFindDuplicates.mockResolvedValue([]);
  mockCreateAsset.mockReset();
  mockCreateAsset.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222", publicUrl: "https://x", tenantId: "t1" });
  mockUpdateAsset.mockReset();
  mockUpdateAsset.mockResolvedValue({});
  mockCreateReference.mockReset();
  mockCreateReference.mockResolvedValue({});
  mockFindById.mockReset();
  mockFindById.mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111",
    tenantId: "t1",
    status: "READY",
    mimeType: "image/jpeg",
    storageKey: "t1/general/old.jpg",
    publicUrl: "https://x/old.jpg",
    size: 1000,
    checksum: "old-c",
  });
  mockProvider.upload.mockReset();
  mockProvider.upload.mockResolvedValue({ storageKey: "t1/replace/new.jpg", publicUrl: "https://x/new.jpg", size: 2048 });
  mockProvider.delete.mockReset();
  mockProvider.delete.mockResolvedValue({});
  mockProvider.exists.mockReset();
  mockProvider.exists.mockResolvedValue(true);
  mockProvider.getObjectMetadata.mockReset();
  mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048 });
  mockProvider.getPublicUrl.mockReset();
  mockProvider.getPublicUrl.mockResolvedValue("https://cdn.example/t1/general/x.mp4");
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

describe("MediaService replace quota (RCCF-35)", () => {
  it("enforces the net delta when the replacement is larger than the existing asset", async () => {
    mockEnforceStorageLimit.mockResolvedValue({
      ok: false,
      used: 1024,
      limit: 1024,
      remaining: 0,
      limitGb: 1,
      reason: "Storage limit reached (1.2 / 1 GB).",
    });

    // existing.size = 1000, replacement = 2048 → net delta = 1048
    const error = await mediaService
      .replace({ assetId: "11111111-1111-4111-8111-111111111111", file: makeFile(2048) })
      .then(() => null)
      .catch((e) => e);

    expect(error).toBeInstanceOf(MediaValidationError);
    expect(mockEnforceStorageLimit).toHaveBeenCalledWith({ tenantId: "t1", incomingBytes: 1048 });
    // The original object must NOT be deleted when the replace is rejected.
    expect(mockProvider.delete).not.toHaveBeenCalled();
  });

  it("does not consume quota when the replacement is smaller or equal", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);

    await mediaService.replace({ assetId: "11111111-1111-4111-8111-111111111111", file: makeFile(800) });

    expect(mockEnforceStorageLimit).toHaveBeenCalledWith({ tenantId: "t1", incomingBytes: 0 });
    expect(mockProvider.delete).toHaveBeenCalled();
  });
});

describe("MediaService signed-upload authoritative size (RCCF-19 P1-S)", () => {
  it("uses the provider-reported size for quota when the client declares smaller", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 50 * 1024 * 1024 });

    await mediaService.completeSignedUpload(signedPayload({ size: 1 }));

    expect(mockEnforceStorageLimit).toHaveBeenCalledWith({ tenantId: "t1", incomingBytes: 50 * 1024 * 1024 });
    expect(mockCreateAsset).toHaveBeenCalledWith(expect.objectContaining({ size: 50 * 1024 * 1024 }), expect.anything());
  });

  it("uses the provider-reported size when the client declares larger", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048 });

    await mediaService.completeSignedUpload(signedPayload({ size: 999 * 1024 * 1024 }));

    expect(mockEnforceStorageLimit).toHaveBeenCalledWith({ tenantId: "t1", incomingBytes: 2048 });
    expect(mockCreateAsset).toHaveBeenCalledWith(expect.objectContaining({ size: 2048 }), expect.anything());
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
    expect(mockCreateAsset).toHaveBeenCalledWith(expect.objectContaining({ size: 2048 }), expect.anything());
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

// RCCF-70.5.1 — media registration integrity & security: storageKey ownership,
// server-derived public URL, fail-closed cleanup, and RCCF-59 reachability.
describe("MediaService signed-upload registration integrity (RCCF-70.5.1)", () => {
  const storageKey = "t1/hero/h.mp4";
  const heroPayload = (overrides: Record<string, unknown> = {}) =>
    signedPayload({ storageKey, folder: "hero", originalFilename: "h.mp4", mimeType: "video/mp4", ...overrides });

  it("accepts a storageKey owned by the authenticated tenant", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);

    const result = await mediaService.completeSignedUpload(signedPayload({ storageKey }));

    expect(result.deduplicated).toBe(false);
    expect(mockCreateAsset).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1", storageKey }),
      expect.anything(),
    );
  });

  it("rejects a foreign-tenant storageKey before any provider access", async () => {
    await expect(
      mediaService.completeSignedUpload(signedPayload({ storageKey: "t2/hero/h.mp4" })),
    ).rejects.toThrow("does not belong to the current tenant");

    expect(mockProvider.exists).not.toHaveBeenCalled();
    expect(mockProvider.getObjectMetadata).not.toHaveBeenCalled();
    expect(mockCreateAsset).not.toHaveBeenCalled();
    expect(mockProvider.delete).not.toHaveBeenCalled();
  });

  it("rejects a storageKey without the tenant prefix", async () => {
    await expect(
      mediaService.completeSignedUpload(signedPayload({ storageKey: "hero/h.mp4" })),
    ).rejects.toThrow("does not belong to the current tenant");
    expect(mockProvider.exists).not.toHaveBeenCalled();
    expect(mockProvider.delete).not.toHaveBeenCalled();
  });

  it("rejects an empty storageKey", async () => {
    await expect(mediaService.completeSignedUpload(signedPayload({ storageKey: "" }))).rejects.toThrow(
      "Invalid storage key",
    );
    expect(mockProvider.exists).not.toHaveBeenCalled();
  });

  it("rejects a traversal-style storageKey even under the tenant prefix", async () => {
    await expect(
      mediaService.completeSignedUpload(signedPayload({ storageKey: "t1/../t2/hero/h.mp4" })),
    ).rejects.toThrow("Malformed storage key");
    expect(mockProvider.exists).not.toHaveBeenCalled();
    expect(mockProvider.delete).not.toHaveBeenCalled();
  });

  it("stores the server-derived canonical URL, never the client-supplied publicUrl", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getPublicUrl.mockResolvedValue("https://cdn.example/t1/hero/h.mp4");

    const result = await mediaService.completeSignedUpload(
      signedPayload({ storageKey, publicUrl: "https://evil.example/not-authoritative" }),
    );

    expect(result.url).toBe("https://cdn.example/t1/hero/h.mp4");
    expect(mockCreateAsset).toHaveBeenCalledWith(
      expect.objectContaining({ publicUrl: "https://cdn.example/t1/hero/h.mp4" }),
      expect.anything(),
    );
  });

  it("creates the Asset row when the provider returns top-level size", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048 });

    const result = await mediaService.completeSignedUpload(signedPayload({ storageKey, size: 1 }));

    expect(result.deduplicated).toBe(false);
    expect(mockCreateAsset).toHaveBeenCalledWith(expect.objectContaining({ size: 2048 }), expect.anything());
  });

  it("creates no Asset row and cleans up the orphan object when metadata fails", async () => {
    mockProvider.getObjectMetadata.mockRejectedValue(new Error("metadata failed"));

    await expect(mediaService.completeSignedUpload(signedPayload({ storageKey }))).rejects.toThrow("metadata failed");
    expect(mockCreateAsset).not.toHaveBeenCalled();
    expect(mockProvider.delete).toHaveBeenCalledWith(storageKey);
  });

  it("stores the provider-reported size and the client mimeType on success", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048, mimeType: "video/mp4" });

    await mediaService.completeSignedUpload(signedPayload({ size: 1 }));

    expect(mockCreateAsset).toHaveBeenCalledWith(
      expect.objectContaining({ size: 2048, mimeType: "video/mp4" }),
      expect.anything(),
    );
  });

  it("routes hero signed uploads through RCCF-59 stored-byte validation", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048, mimeType: "video/mp4" });
    mockProvider.readRange.mockResolvedValue(heroMp4(10));

    const result = await mediaService.completeSignedUpload(heroPayload({ size: 1 }));

    expect(mockProvider.readRange).toHaveBeenCalled();
    expect(result.deduplicated).toBe(false);
    expect(mockCreateAsset).toHaveBeenCalledWith(expect.objectContaining({ size: 2048 }), expect.anything());
  });

  it("keeps invalid hero videos rejected after the metadata fix", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048, mimeType: "video/mp4" });
    mockProvider.readRange.mockResolvedValue(heroMp4(20));

    await expect(mediaService.completeSignedUpload(heroPayload({ size: 1 }))).rejects.toThrow(/too long|seconds/i);
    expect(mockCreateAsset).not.toHaveBeenCalled();
    expect(mockProvider.delete).toHaveBeenCalledWith(storageKey);
  });

  it("does not consume quota when registration fails validation", async () => {
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 600 * 1024 * 1024 });

    await expect(mediaService.completeSignedUpload(signedPayload({ storageKey, size: 1 }))).rejects.toThrow(
      MediaValidationError,
    );
    expect(mockEnforceStorageLimit).not.toHaveBeenCalled();
    expect(mockCreateAsset).not.toHaveBeenCalled();
  });

  it("does not create duplicate Asset rows on a failed registration", async () => {
    mockEnforceStorageLimit.mockResolvedValue({
      ok: false,
      used: 999,
      limit: 1000,
      remaining: 1,
      limitGb: 1,
      reason: "Storage limit reached.",
    });

    await expect(mediaService.completeSignedUpload(signedPayload({ storageKey }))).rejects.toThrow("Storage limit reached");
    expect(mockCreateAsset).not.toHaveBeenCalled();
    expect(mockProvider.delete).toHaveBeenCalledWith(storageKey);
  });

  it("keeps the object when the Asset row was committed but a later step fails", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048 });
    mockCreateAsset.mockResolvedValue({ id: "a-committed", publicUrl: "https://cdn.example/x", tenantId: "t1" });
    mockCreateReference.mockRejectedValue(new Error("reference constraint failed"));

    await expect(
      mediaService.completeSignedUpload(signedPayload({ storageKey, entityType: "asset", entityId: "e1" })),
    ).rejects.toThrow("reference constraint failed");
    expect(mockCreateAsset).toHaveBeenCalled();
    expect(mockProvider.delete).not.toHaveBeenCalled();
  });
});

// RCCF-70.5.3 — Hero Poster / Background registration. The hero folder holds
// BOTH videos and poster/background images; hero-video validation (RCCF-59)
// must only run for video payloads, while images register through the generic
// media validation. Any video signal fails closed toward hero-video validation.
describe("MediaService hero poster/background registration (RCCF-70.5.3)", () => {
  const heroImagePayload = (overrides: Record<string, unknown> = {}) =>
    signedPayload({
      storageKey: "t1/hero/poster.png",
      folder: "hero",
      originalFilename: "poster.png",
      mimeType: "image/png",
      ...overrides,
    });

  it("registers a hero poster image without hero-video validation", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048, mimeType: "image/png" });

    const result = await mediaService.completeSignedUpload(heroImagePayload({ size: 1 }));

    expect(result.deduplicated).toBe(false);
    expect(mockProvider.readRange).not.toHaveBeenCalled();
    expect(mockCreateAsset).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1", mimeType: "image/png", size: 2048 }),
      expect.anything(),
    );
  });

  it("registers a hero background image without hero-video validation", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 4096, mimeType: "image/jpeg" });

    const result = await mediaService.completeSignedUpload(
      heroImagePayload({ storageKey: "t1/hero/bg.jpg", originalFilename: "bg.jpg", mimeType: "image/jpeg", size: 1 }),
    );

    expect(result.deduplicated).toBe(false);
    expect(mockProvider.readRange).not.toHaveBeenCalled();
    expect(mockCreateAsset).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: "image/jpeg", size: 4096 }),
      expect.anything(),
    );
  });

  it("fails closed toward hero-video validation when the provider records a video", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048, mimeType: "video/mp4" });
    mockProvider.readRange.mockResolvedValue(heroMp4(10));

    await expect(mediaService.completeSignedUpload(heroImagePayload({ size: 1 }))).rejects.toThrow(/MP4|format|hero/i);
    expect(mockCreateAsset).not.toHaveBeenCalled();
  });

  it("rejects an oversized hero-folder image via the generic image limit", async () => {
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 20 * 1024 * 1024, mimeType: "image/png" });

    await expect(mediaService.completeSignedUpload(heroImagePayload({ size: 1 }))).rejects.toThrow(MediaValidationError);
    expect(mockCreateAsset).not.toHaveBeenCalled();
  });

  it("rejects a hero video when the provider read fails (fail closed + cleanup)", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.getObjectMetadata.mockResolvedValue({ size: 2048, mimeType: "video/mp4" });
    mockProvider.readRange.mockImplementation(() => { throw new Error("provider down"); });

    await expect(
      mediaService.completeSignedUpload(
        signedPayload({ storageKey: "t1/hero/h.mp4", folder: "hero", originalFilename: "h.mp4", mimeType: "video/mp4", size: 1 }),
      ),
    ).rejects.toThrow("provider down");
    expect(mockCreateAsset).not.toHaveBeenCalled();
    expect(mockProvider.delete).toHaveBeenCalledWith("t1/hero/h.mp4");
  });

  it("does not apply the hero-video precheck to hero-folder images at prepare", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: false, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.createSignedUploadUrl.mockResolvedValue({
      uploadUrl: "https://up.example",
      storageKey: "t1/hero/poster.png",
      publicUrl: "https://p.example/poster.png",
    });

    const result = await mediaService.prepareSignedUpload({
      tenantId: "t1",
      filename: "poster.png",
      mimeType: "image/png",
      size: 2048,
      checksum: "c1",
      folder: "hero",
    });

    expect(result.deduplicated).toBe(false);
    if (result.deduplicated) throw new Error("expected non-dedup result");
    expect(result.signed).not.toBeNull();
  });

  it("uploads a hero-folder image via the multipart path without hero-video validation", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: false, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    mockProvider.upload.mockResolvedValue({ storageKey: "t1/hero/poster.png", publicUrl: "https://x/poster.png", size: 2048 });

    const file = { filename: "poster.png", mimeType: "image/png", size: 2048, buffer: Buffer.alloc(16) };
    const result = await mediaService.upload({ tenantId: "t1", file, folder: "hero" });

    expect(result.deduplicated).toBe(false);
    expect(mockCreateAsset).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "image/png" }), expect.anything());
  });

  it("allows moving an image into the hero folder (no hero-video validation)", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: false, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockFindById.mockResolvedValue({
      id: "a1", tenantId: "t1", mimeType: "image/png", size: 2048,
      storageKey: "t1/general/poster.png", publicUrl: "https://x/poster.png", status: "ACTIVE",
      filename: "poster.png", originalFilename: "poster.png", checksum: "c", width: null, height: null, altText: null,
    });
    mockProvider.getPublicUrl.mockResolvedValue("https://x/hero/poster.png");
    mockProvider.readRange.mockResolvedValue(Buffer.alloc(16));
    mockProvider.upload.mockResolvedValue({ storageKey: "t1/hero/poster.png", publicUrl: "https://x/hero/poster.png", size: 16 });

    await expect(mediaService.move("t1", "a1", "hero")).resolves.toBeUndefined();
    expect(mockUpdateAsset).toHaveBeenCalledWith("a1", expect.objectContaining({ storageKey: "t1/hero/poster.png" }));
  });

  it("replaces a hero-folder poster image without hero-video validation", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: false, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockFindById.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111", tenantId: "t1", mimeType: "image/png", size: 1000,
      storageKey: "t1/hero/poster.png", publicUrl: "https://x/poster.png", status: "READY",
      filename: "poster.png", originalFilename: "poster.png", checksum: "c", width: null, height: null, altText: null,
    });
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);

    const file = { filename: "poster.png", mimeType: "image/png", size: 2048, buffer: Buffer.alloc(16) };
    const result = await mediaService.replace({ assetId: "11111111-1111-4111-8111-111111111111", file });

    expect(result.deduplicated).toBe(false);
    expect(mockProvider.delete).toHaveBeenCalledWith("t1/hero/poster.png");
  });
});

// RCCF-59 — hero video enforcement at the media-service boundary.
function heroMp4(durationSec: number): Buffer {
  const mvhd = Buffer.alloc(28);
  mvhd.writeUInt32BE(28, 0);
  mvhd.write("mvhd", 4, 4, "ascii");
  mvhd.writeUInt8(0, 8);
  mvhd.writeUInt32BE(1000, 20);
  mvhd.writeUInt32BE(durationSec * 1000, 24);
  const moov = Buffer.alloc(36);
  moov.writeUInt32BE(36, 0);
  moov.write("moov", 4, 4, "ascii");
  mvhd.copy(moov, 8);
  const ftyp = Buffer.alloc(24);
  ftyp.writeUInt32BE(24, 0);
  ftyp.write("ftyp", 4, 4, "ascii");
  return Buffer.concat([ftyp, moov]);
}

describe("MediaService hero video (RCCF-59)", () => {
  function heroEnabled() {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
  }

  it("rejects a hero video over 12 MB before uploading bytes", async () => {
    heroEnabled();
    const file = { filename: "hero.mp4", mimeType: "video/mp4", size: 13 * 1024 * 1024, buffer: heroMp4(10) };
    await expect(mediaService.upload({ tenantId: "t1", file, folder: "hero" })).rejects.toThrow("too large");
    expect(mockProvider.upload).not.toHaveBeenCalled();
  });

  it("rejects a hero video over 15 seconds", async () => {
    heroEnabled();
    const file = { filename: "hero.mp4", mimeType: "video/mp4", size: 1024, buffer: heroMp4(20) };
    await expect(mediaService.upload({ tenantId: "t1", file, folder: "hero" })).rejects.toThrow("too long");
    expect(mockProvider.upload).not.toHaveBeenCalled();
  });

  it("rejects a hero video on a plan without the hero capability", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: false, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockEnforceStorageLimit.mockResolvedValue(OK_QUOTA);
    const file = { filename: "hero.mp4", mimeType: "video/mp4", size: 1024, buffer: heroMp4(10) };
    await expect(mediaService.upload({ tenantId: "t1", file, folder: "hero" })).rejects.toThrow("not available");
  });

  it("accepts a valid 12 MB / 15 s hero video and records it under the storage quota", async () => {
    heroEnabled();
    mockProvider.upload.mockResolvedValue({ storageKey: "t1/hero/h.mp4", publicUrl: "https://x/h.mp4", size: 1024 });
    const file = { filename: "hero.mp4", mimeType: "video/mp4", size: 1024, buffer: heroMp4(15) };
    const result = await mediaService.upload({ tenantId: "t1", file, folder: "hero" });
    expect(result.deduplicated).toBe(false);
    expect(mockCreateAsset).toHaveBeenCalledWith(expect.objectContaining({ size: 1024 }), expect.anything());
  });
});

// RCCF-67.3 — the hero write path is ASSET-BACKED: a raw URL can never become
// the hero-video authority. assertHeroVideoAsset re-reads the stored object and
// enforces tenant ownership + RCCF-59 constraints on an EXISTING asset.
describe("MediaService.assertHeroVideoAsset (RCCF-67.3)", () => {
  function existingAsset(overrides: Record<string, unknown> = {}) {
    return {
      id: "a1", tenantId: "t1", mimeType: "video/mp4", size: 1024,
      storageKey: "t1/hero/a.mp4", publicUrl: "https://x/a.mp4", status: "ACTIVE",
      filename: "a.mp4", originalFilename: "a.mp4", checksum: "c", width: null, height: null, altText: null,
      ...overrides,
    };
  }

  it("accepts a valid tenant-owned MP4 hero asset (server-verified bytes + duration)", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockFindById.mockResolvedValue(existingAsset());
    mockProvider.readRange.mockResolvedValue(heroMp4(10));
    await expect(mediaService.assertHeroVideoAsset("t1", "a1")).resolves.toBeUndefined();
  });

  it("rejects a cross-tenant asset", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockFindById.mockResolvedValue(existingAsset({ tenantId: "t2" }));
    await expect(mediaService.assertHeroVideoAsset("t1", "a1")).rejects.toThrow("Hero video asset not found");
  });

  it("rejects a DELETED asset", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockFindById.mockResolvedValue(existingAsset({ status: "DELETED" }));
    await expect(mediaService.assertHeroVideoAsset("t1", "a1")).rejects.toThrow("not available");
  });

  it("rejects an over-12MB asset as a hero video", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockFindById.mockResolvedValue(existingAsset({ size: 30 * 1024 * 1024 }));
    mockProvider.readRange.mockResolvedValue(Buffer.alloc(30 * 1024 * 1024));
    await expect(mediaService.assertHeroVideoAsset("t1", "a1")).rejects.toThrow("too large");
  });

  it("rejects an unsupported format asset", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockFindById.mockResolvedValue(existingAsset({ mimeType: "video/webm" }));
    mockProvider.readRange.mockResolvedValue(Buffer.alloc(16));
    await expect(mediaService.assertHeroVideoAsset("t1", "a1")).rejects.toThrow(/MP4|format/i);
  });

  it("rejects when a provider cannot read the object (fail closed, no trust in client size)", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockFindById.mockResolvedValue(existingAsset());
    mockProvider.readRange.mockImplementation(() => { throw new Error("provider down"); });
    await expect(mediaService.assertHeroVideoAsset("t1", "a1")).rejects.toThrow();
  });
});

// RCCF-67.3 — copy/move are tenant-scoped and quota/hero-safe.
describe("MediaService.copy / move (RCCF-67.3)", () => {
  function existingAsset(overrides: Record<string, unknown> = {}) {
    return {
      id: "a1", tenantId: "t1", mimeType: "video/mp4", size: 1024,
      storageKey: "t1/general/a.mp4", publicUrl: "https://x/a.mp4", status: "ACTIVE",
      filename: "a.mp4", originalFilename: "a.mp4", checksum: "c", width: null, height: null, altText: null,
      ...overrides,
    };
  }

  it("copy rejects a cross-tenant asset", async () => {
    mockFindById.mockResolvedValue(existingAsset({ tenantId: "t2" }));
    await expect(mediaService.copy("t1", "a1")).rejects.toThrow("Asset not found");
  });

  it("copy rejects a deleted asset", async () => {
    mockFindById.mockResolvedValue(existingAsset({ status: "DELETED" }));
    await expect(mediaService.copy("t1", "a1")).rejects.toThrow("Cannot copy deleted asset");
  });

  it("move rejects a cross-tenant asset", async () => {
    mockFindById.mockResolvedValue(existingAsset({ tenantId: "t2" }));
    await expect(mediaService.move("t1", "a1", "general")).rejects.toThrow("Asset not found");
  });

  it("move to hero runs hero validation and rejects an over-12MB video before any write", async () => {
    mockResolveHeroVideoCapability.mockReturnValue({ enabled: true, maxSizeBytes: 12 * 1024 * 1024, maxDurationSec: 15 });
    mockFindById.mockResolvedValue(existingAsset({ size: 30 * 1024 * 1024 }));
    mockProvider.readRange.mockResolvedValue(Buffer.alloc(30 * 1024 * 1024));
    await expect(mediaService.move("t1", "a1", "hero")).rejects.toThrow("too large");
    expect(mockProvider.upload).not.toHaveBeenCalled();
    expect(mockProvider.delete).not.toHaveBeenCalled();
  });
});
