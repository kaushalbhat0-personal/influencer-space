import { describe, it, expect, vi, beforeEach } from "vitest";

// RCCF-70.5.1 — regression coverage for the exact Supabase `.info()` response
// shape. Supabase returns `size`/`contentType` at the TOP level and `metadata`
// as an empty object `{}`. Reading `data.metadata.size` was the bug that broke
// every signed upload with "Supabase metadata failed: unknown". This test
// exists specifically to prevent that regression from returning.

const { mockInfo } = vi.hoisted(() => ({ mockInfo: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        info: mockInfo,
      }),
    },
  }),
}));

import { SupabaseStorageProvider } from "../supabase";

function makeProvider(): SupabaseStorageProvider {
  return new SupabaseStorageProvider("https://example.supabase.co", "test-service-role-key");
}

beforeEach(() => {
  mockInfo.mockReset();
});

describe("SupabaseStorageProvider.getObjectMetadata (RCCF-70.5.1)", () => {
  it("maps the top-level size/contentType from the real .info() shape", async () => {
    mockInfo.mockResolvedValue({
      data: { size: 11779741, contentType: "video/mp4", metadata: {} },
      error: null,
    });
    await expect(makeProvider().getObjectMetadata("t1/hero/a.mp4")).resolves.toEqual({
      size: 11779741,
      mimeType: "video/mp4",
    });
  });

  it("treats metadata={} as valid and never consults metadata.size", async () => {
    mockInfo.mockResolvedValue({ data: { size: 1234, metadata: {} }, error: null });
    await expect(makeProvider().getObjectMetadata("t1/general/a.png")).resolves.toEqual({
      size: 1234,
      mimeType: undefined,
    });
  });

  it("uses top-level size even when a conflicting metadata.size exists", async () => {
    mockInfo.mockResolvedValue({
      data: { size: 100, metadata: { size: 999, mimetype: "image/png" } },
      error: null,
    });
    const result = await makeProvider().getObjectMetadata("t1/general/a.png");
    expect(result.size).toBe(100);
    expect(result.mimeType).toBeUndefined();
  });

  it("maps contentType as mimeType even when metadata.mimetype differs", async () => {
    mockInfo.mockResolvedValue({
      data: { size: 2048, contentType: "video/mp4", metadata: { mimetype: "image/png" } },
      error: null,
    });
    await expect(makeProvider().getObjectMetadata("t1/general/a.mp4")).resolves.toEqual({
      size: 2048,
      mimeType: "video/mp4",
    });
  });

  it("succeeds with undefined mimeType when contentType is missing", async () => {
    mockInfo.mockResolvedValue({ data: { size: 2048, metadata: {} }, error: null });
    await expect(makeProvider().getObjectMetadata("t1/general/a.mp4")).resolves.toEqual({
      size: 2048,
      mimeType: undefined,
    });
  });

  it("rejects when size is missing from the response", async () => {
    mockInfo.mockResolvedValue({ data: { contentType: "video/mp4", metadata: {} }, error: null });
    await expect(makeProvider().getObjectMetadata("t1/general/a.mp4")).rejects.toThrow("Supabase metadata failed");
  });

  it("rejects when the provider reports an error", async () => {
    mockInfo.mockResolvedValue({ data: null, error: { message: "Object not found" } });
    await expect(makeProvider().getObjectMetadata("t1/general/missing.mp4")).rejects.toThrow(
      "Supabase metadata failed: Object not found",
    );
  });

  it("rejects with 'unknown' when the provider error carries no message", async () => {
    mockInfo.mockResolvedValue({ data: null, error: {} });
    await expect(makeProvider().getObjectMetadata("t1/general/a.mp4")).rejects.toThrow(
      "Supabase metadata failed: unknown",
    );
  });
});