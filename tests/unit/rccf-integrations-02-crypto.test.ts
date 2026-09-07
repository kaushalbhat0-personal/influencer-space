import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomBytes } from "node:crypto";

function makeHexKey(): string {
  return randomBytes(32).toString("hex"); // 64 hex
}
function makeBase64Key(): string {
  return randomBytes(32).toString("base64"); // 44 chars
}

describe("RCCF-INTEGRATIONS-02 — crypto key representations", () => {
  const orig = process.env.TOKEN_ENCRYPTION_KEY;

  afterEach(() => {
    if (orig === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = orig;
    vi.resetModules();
  });

  it("hex key (64 hex) encrypts and decrypts round-trip", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = makeHexKey();
    vi.resetModules();
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const plain = "rk_test_razorpay_secret_123";
    const ct = encrypt(plain);
    expect(ct).not.toBe(plain);
    expect(decrypt(ct)).toBe(plain);
  });

  it("base64 key (44 chars) encrypts and decrypts round-trip", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = makeBase64Key();
    vi.resetModules();
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const plain = "instagram_access_token_abc";
    const ct = encrypt(plain);
    expect(decrypt(ct)).toBe(plain);
  });

  it("ciphertext from base64 key decrypts with same base64 key (compatibility)", async () => {
    const key = makeBase64Key();
    process.env.TOKEN_ENCRYPTION_KEY = key;
    vi.resetModules();
    const mod1 = await import("@/lib/crypto");
    const ct = mod1.encrypt("compat-payload");
    // Re-import with same key — should still decrypt (simulates existing PaymentAccount row)
    vi.resetModules();
    process.env.TOKEN_ENCRYPTION_KEY = key;
    const mod2 = await import("@/lib/crypto");
    expect(mod2.decrypt(ct)).toBe("compat-payload");
  });

  it("hex and base64 keys for same bytes produce different ciphertext but both round-trip independently", async () => {
    const bytes = randomBytes(32);
    const hexKey = bytes.toString("hex");
    const b64Key = bytes.toString("base64");
    process.env.TOKEN_ENCRYPTION_KEY = hexKey;
    vi.resetModules();
    const modHex = await import("@/lib/crypto");
    const ctHex = modHex.encrypt("same-bytes");
    expect(modHex.decrypt(ctHex)).toBe("same-bytes");

    process.env.TOKEN_ENCRYPTION_KEY = b64Key;
    vi.resetModules();
    const modB64 = await import("@/lib/crypto");
    const ctB64 = modB64.encrypt("same-bytes");
    expect(modB64.decrypt(ctB64)).toBe("same-bytes");
    // Ciphertexts differ because IV differs, but crucially both keys decode to identical 32 bytes
    // so cross-decrypt would also work (same underlying bytes) — we verify hex vs b64 equivalence:
    process.env.TOKEN_ENCRYPTION_KEY = b64Key;
    vi.resetModules();
    const modB64b = await import("@/lib/crypto");
    expect(modB64b.decrypt(ctHex)).toBe("same-bytes");
  });

  it("rejects key that decodes to wrong length (too short)", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = "short";
    vi.resetModules();
    const { encrypt } = await import("@/lib/crypto");
    expect(() => encrypt("x")).toThrow(/32 bytes/);
  });

  it("rejects hex-looking string of wrong length", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(32); // 32 hex chars = 16 bytes
    vi.resetModules();
    const { encrypt } = await import("@/lib/crypto");
    expect(() => encrypt("x")).toThrow(/32 bytes/);
  });

  it("rejects 48-byte base64 decode (e.g. 64 base64 chars)", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(48).toString("base64");
    vi.resetModules();
    const { encrypt } = await import("@/lib/crypto");
    expect(() => encrypt("x")).toThrow(/32 bytes/);
  });

  it("throws when TOKEN_ENCRYPTION_KEY is missing", async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    vi.resetModules();
    const { encrypt } = await import("@/lib/crypto");
    expect(() => encrypt("x")).toThrow(/not set/);
  });

  it("never logs key material — encrypt/decrypt errors do not contain raw key", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = "bad-key";
    vi.resetModules();
    const { encrypt } = await import("@/lib/crypto");
    try {
      encrypt("x");
    } catch (e) {
      expect((e as Error).message).not.toContain("bad-key");
    }
  });

  it("ciphertext is non-deterministic (IV) but decrypt is deterministic", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = makeBase64Key();
    vi.resetModules();
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const ct1 = encrypt("hello");
    const ct2 = encrypt("hello");
    expect(ct1).not.toBe(ct2);
    expect(decrypt(ct1)).toBe("hello");
    expect(decrypt(ct2)).toBe("hello");
  });
});
