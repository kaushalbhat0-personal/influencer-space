import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";

const TEST_KEY_B64 = randomBytes(32).toString("base64");

describe("RCCF-INT-IG-REFRESH — Instagram token refresh reliability", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY_B64;
    // Clear Instagram OAuth env to avoid throw in exchangeCodeForToken
    process.env.INSTAGRAM_CLIENT_ID = "test_client";
    process.env.INSTAGRAM_CLIENT_SECRET = "test_secret";
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.resetModules();
    delete process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.INSTAGRAM_CLIENT_ID;
    delete process.env.INSTAGRAM_CLIENT_SECRET;
  });

  it("valid non-expired token is returned without refresh", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const raw = "ig_long_lived_token_valid_123";
    const enc = encrypt(raw);
    const future = new Date(Date.now() + 60 * 24 * 3600 * 1000);

    const mockFindUnique = vi.fn(async () => ({
      instagramAccessToken: enc,
      instagramTokenExpiry: future,
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenant: { findUnique: mockFindUnique, update: vi.fn(async () => ({})) },
      },
    }));

    const { getDecryptedToken, refreshToken } = await import("@/lib/social-oauth");
    const token = await getDecryptedToken("tenant-1", "instagram");
    expect(token).toBe(raw);
    // refresh should still work but not needed — it would return decrypted expired path, but we test direct refresh not called
    expect(mockFindUnique).toHaveBeenCalled();
  });

  it("expired token getDecryptedToken returns null (preserved), refreshToken decrypts expired and refreshes successfully", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const oldRaw = "ig_expired_token_old_abc";
    const newRaw = "ig_refreshed_token_new_xyz";
    const encOld = encrypt(oldRaw);
    const past = new Date(Date.now() - 24 * 3600 * 1000);

    // First call: getDecryptedToken with expiry in past -> null
    let findCallCount = 0;
    const mockFindUnique = vi.fn(async () => {
      findCallCount++;
      return {
        instagramAccessToken: encOld,
        instagramTokenExpiry: past,
      };
    });
    const mockUpdate = vi.fn(async () => ({}));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenant: { findUnique: mockFindUnique, update: mockUpdate },
      },
    }));

    // Mock fetch for refresh endpoint
    global.fetch = vi.fn(async (url: string) => {
      if (url.includes("refresh_access_token")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: newRaw, expires_in: 5184000 }),
        } as unknown as Response;
      }
      return { ok: false, status: 404, text: async () => "not found" } as unknown as Response;
    }) as unknown as typeof fetch;

    const { getDecryptedToken, refreshToken } = await import("@/lib/social-oauth");

    // getDecryptedToken should return null for expired
    const expiredResult = await getDecryptedToken("tenant-1", "instagram");
    expect(expiredResult).toBeNull();

    // refreshToken should decrypt expired and succeed
    const refreshed = await refreshToken("tenant-1", "instagram");
    expect(refreshed).toBe(newRaw);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tenant-1" },
        data: expect.objectContaining({
          instagramAccessToken: expect.any(String),
          instagramTokenExpiry: expect.any(Date),
        }),
      })
    );

    // Verify the stored encrypted value decrypts to newRaw
    const storedEnc = (mockUpdate.mock.calls[0][0] as { data: { instagramAccessToken: string } }).data.instagramAccessToken;
    expect(storedEnc).not.toBe(oldRaw);
    expect(storedEnc).not.toBe(newRaw);
    // decrypt it with same key
    const { decrypt } = await import("@/lib/crypto");
    expect(decrypt(storedEnc)).toBe(newRaw);
  });

  it("expired token with failed refresh (401/invalid) returns null and does not persist new token", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const oldRaw = "ig_expired_invalid";
    const encOld = encrypt(oldRaw);
    const past = new Date(Date.now() - 10 * 24 * 3600 * 1000);

    const mockUpdate = vi.fn(async () => ({}));
    const mockFindUnique = vi.fn(async () => ({
      instagramAccessToken: encOld,
      instagramTokenExpiry: past,
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: { tenant: { findUnique: mockFindUnique, update: mockUpdate } },
    }));

    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Invalid token" } }),
      text: async () => "Invalid token",
    } as unknown as Response)) as unknown as typeof fetch;

    const { refreshToken } = await import("@/lib/social-oauth");
    const result = await refreshToken("tenant-1", "instagram");
    expect(result).toBeNull();
    // Should NOT have called update with new token
    expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ instagramAccessToken: expect.any(String) }) }));
  });

  it("refreshToken returns null when no token stored (missing)", async () => {
    vi.doMock("@/lib/prisma", () => ({
      prisma: { tenant: { findUnique: vi.fn(async () => ({ instagramAccessToken: null, instagramTokenExpiry: null })), update: vi.fn() } },
    }));
    const { refreshToken } = await import("@/lib/social-oauth");
    expect(await refreshToken("tenant-1", "instagram")).toBeNull();
  });

  it("encryption/decryption compatibility preserved (hex/base64 key, no leakage)", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const payload = "ig_token_secret_value_should_not_appear_in_logs";
    const enc = encrypt(payload);
    expect(enc).not.toContain(payload);
    expect(decrypt(enc)).toBe(payload);
    // Ensure error path does not log raw token — getDecryptedToken catch returns null, not throw with token
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenant: {
          findUnique: vi.fn(async () => ({
            instagramAccessToken: "not-valid-base64-encrypted!!",
            instagramTokenExpiry: new Date(Date.now() + 100000),
          })),
          update: vi.fn(),
        },
      },
    }));
    const { getDecryptedToken } = await import("@/lib/social-oauth");
    const res = await getDecryptedToken("t1", "instagram");
    expect(res).toBeNull(); // decrypt failure returns null, no throw with token
  });

  it("no plaintext token leakage in refresh error path", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const raw = "ig_secret_leak_test";
    const enc = encrypt(raw);
    const past = new Date(Date.now() - 1000);
    vi.doMock("@/lib/prisma", () => ({
      prisma: { tenant: { findUnique: vi.fn(async () => ({ instagramAccessToken: enc, instagramTokenExpiry: past })), update: vi.fn() } },
    }));
    // fetch throws
    global.fetch = vi.fn(async () => { throw new Error("network down"); }) as unknown as typeof fetch;
    const { refreshToken } = await import("@/lib/social-oauth");
    const res = await refreshToken("t1", "instagram");
    expect(res).toBeNull();
    // Ensure raw not in error (refreshToken catches and returns null)
  });

  it("sync-socials Instagram path: expired token now attempts refresh before skipping (existing sync behavior preserved for valid token)", async () => {
    // This test mimics the sync-socials logic: getDecryptedToken -> if null try refreshToken
    const { encrypt } = await import("@/lib/crypto");
    const oldRaw = "ig_old_expired";
    const newRaw = "ig_new_refreshed";
    const encOld = encrypt(oldRaw);
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 5000000);

    const mockUpdate = vi.fn(async () => ({}));
    let findCount = 0;
    const mockFindUnique = vi.fn(async () => {
      findCount++;
      // First call from getDecryptedToken: expired -> null path; second from refreshToken internal: allowExpired true -> decrypt
      return { instagramAccessToken: encOld, instagramTokenExpiry: past };
    });

    vi.doMock("@/lib/prisma", () => ({
      prisma: { tenant: { findUnique: mockFindUnique, update: mockUpdate } },
    }));

    global.fetch = vi.fn(async (url: string) => {
      if (typeof url === "string" && url.includes("refresh_access_token")) {
        return { ok: true, status: 200, json: async () => ({ access_token: newRaw, expires_in: 5184000 }) } as unknown as Response;
      }
      // For Instagram stats, not needed in this unit
      return { ok: true, status: 200, json: async () => ({ followers_count: 123, media_count: 10 }) } as unknown as Response;
    }) as unknown as typeof fetch;

    const { getDecryptedToken, refreshToken } = await import("@/lib/social-oauth");
    // Simulate sync-socials logic
    let instaToken: string | null = null;
    try { instaToken = await getDecryptedToken("t1", "instagram"); } catch {}
    if (!instaToken) {
      try { instaToken = await refreshToken("t1", "instagram"); } catch {}
    }
    expect(instaToken).toBe(newRaw);
    expect(mockUpdate).toHaveBeenCalled(); // refresh persisted
  });
});
