import { describe, it, expect, vi, beforeEach } from "vitest";

// RCCF-59 — canonical Creator storage (MB) + hero video capability + enforcement.

const { mockResolveActivePlan, mockAggregate } = vi.hoisted(() => ({
  mockResolveActivePlan: vi.fn(),
  mockAggregate: vi.fn(),
}));

vi.mock("@/modules/billing/application/plan-source", () => ({
  resolveActivePlan: mockResolveActivePlan,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { asset: { aggregate: mockAggregate } },
}));

import { resolveStorageLimitBytes, resolveHeroVideoCapability, enforceStorageLimit, BYTES_PER_MB, BYTES_PER_GB, countStorageUsage } from "@/modules/billing/application/storage.enforcement";
import { parseMp4Duration, validateHeroVideo } from "@/lib/media/hero-validation";

/** Build a minimal ISO-BMFF MP4 buffer whose mvhd encodes the given duration. */
function mp4Buffer(durationSec: number): Buffer {
  const timescale = 1000;
  const duration = durationSec * 1000;
  const mvhd = Buffer.alloc(28);
  mvhd.writeUInt32BE(28, 0);
  mvhd.write("mvhd", 4, 4, "ascii");
  mvhd.writeUInt8(0, 8); // version 0
  mvhd.writeUInt32BE(0, 12); // creation_time
  mvhd.writeUInt32BE(0, 16); // modification_time
  mvhd.writeUInt32BE(timescale, 20);
  mvhd.writeUInt32BE(duration, 24);
  const moov = Buffer.alloc(8 + 28);
  moov.writeUInt32BE(8 + 28, 0);
  moov.write("moov", 4, 4, "ascii");
  mvhd.copy(moov, 8);
  const ftyp = Buffer.alloc(24);
  ftyp.writeUInt32BE(24, 0);
  ftyp.write("ftyp", 4, 4, "ascii");
  ftyp.write("isom", 8, 4, "ascii");
  return Buffer.concat([ftyp, moov]);
}

const RULES = { enabled: true, maxSizeBytes: 12 * BYTES_PER_MB, maxDurationSec: 15 };

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveActivePlan.mockReset();
  mockAggregate.mockReset();
});

describe("RCCF-59 — canonical Creator storage (MB)", () => {
  it("resolves 20 / 100 / 300 MB for Launch / Growth / Scale", () => {
    expect(resolveStorageLimitBytes("creator_launch")).toBe(20 * BYTES_PER_MB);
    expect(resolveStorageLimitBytes("creator_grow")).toBe(100 * BYTES_PER_MB);
    expect(resolveStorageLimitBytes("creator_scale")).toBe(300 * BYTES_PER_MB);
  });

  it("keeps Enterprise configurable (custom); Partner plans have no storage (RCCF-60.3)", () => {
    expect(resolveStorageLimitBytes("creator_enterprise")).toBe(500 * BYTES_PER_GB);
    expect(resolveStorageLimitBytes("partner_solo")).toBeNull();
    expect(resolveStorageLimitBytes("partner_scale")).toBeNull();
  });

  it("hero video enabled on Launch/Growth/Scale with 12 MB / 15 s; disabled elsewhere", () => {
    for (const code of ["creator_launch", "creator_grow", "creator_scale"]) {
      const hero = resolveHeroVideoCapability(code);
      expect(hero.enabled).toBe(true);
      expect(hero.maxSizeBytes).toBe(12 * BYTES_PER_MB);
      expect(hero.maxDurationSec).toBe(15);
    }
    expect(resolveHeroVideoCapability("creator_enterprise").enabled).toBe(false);
    expect(resolveHeroVideoCapability("partner_free").enabled).toBe(false);
  });
});

describe("RCCF-59 — MP4 duration parsing (server-side authority)", () => {
  it("parses the mvhd duration in seconds", () => {
    expect(parseMp4Duration(mp4Buffer(15))).toBe(15);
    expect(parseMp4Duration(mp4Buffer(20))).toBe(20);
  });

  it("returns null for unparseable buffers (fail closed)", () => {
    expect(parseMp4Duration(Buffer.alloc(64))).toBeNull();
    expect(parseMp4Duration(Buffer.from("not a video at all", "ascii"))).toBeNull();
  });
});

describe("RCCF-59 — hero video validation", () => {
  it("accepts a 12 MB / 15 s MP4", () => {
    expect(validateHeroVideo({ mimeType: "video/mp4", size: 12 * BYTES_PER_MB, buffer: mp4Buffer(15), rules: RULES })).toBeNull();
  });

  it("rejects a hero video over 12 MB", () => {
    const err = validateHeroVideo({ mimeType: "video/mp4", size: 12 * BYTES_PER_MB + 1, buffer: mp4Buffer(10), rules: RULES });
    expect(err).toMatch(/too large/);
    expect(err).toContain("12 MB");
  });

  it("rejects a hero video over 15 seconds", () => {
    const err = validateHeroVideo({ mimeType: "video/mp4", size: 5 * BYTES_PER_MB, buffer: mp4Buffer(15.1), rules: RULES });
    expect(err).toMatch(/too long/);
    expect(err).toContain("15 seconds");
  });

  it("accepts exactly 15 seconds", () => {
    expect(validateHeroVideo({ mimeType: "video/mp4", size: 5 * BYTES_PER_MB, buffer: mp4Buffer(15), rules: RULES })).toBeNull();
  });

  it("rejects non-ISO-BMFF formats (WebM/Ogg) because duration cannot be verified", () => {
    expect(validateHeroVideo({ mimeType: "video/webm", size: 1000, buffer: mp4Buffer(10), rules: RULES })).toMatch(/MP4 is required/);
    expect(validateHeroVideo({ mimeType: "video/ogg", size: 1000, buffer: mp4Buffer(10), rules: RULES })).toMatch(/MP4 is required/);
  });

  it("rejects when the plan has hero disabled", () => {
    expect(validateHeroVideo({ mimeType: "video/mp4", size: 1000, buffer: mp4Buffer(10), rules: { ...RULES, enabled: false } })).toMatch(/not available/);
  });

  it("rejects when the duration cannot be parsed", () => {
    expect(validateHeroVideo({ mimeType: "video/mp4", size: 1000, buffer: Buffer.alloc(256), rules: RULES })).toMatch(/Could not verify/);
  });
});

describe("RCCF-59 — enforcement (MB) + accounting", () => {
  it("Launch enforces a 20 MB ceiling", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "active" });
    const ok = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 19 * BYTES_PER_MB, used: 0 });
    expect(ok.ok).toBe(true);
    const reject = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 1 * BYTES_PER_MB, used: 19.5 * BYTES_PER_MB });
    expect(reject.ok).toBe(false);
    expect(reject.reason).toContain("20 MB");
  });

  it("Scale allows up to 300 MB", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_scale", origin: "v2", status: "active" });
    const ok = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 50 * BYTES_PER_MB, used: 250 * BYTES_PER_MB });
    expect(ok.ok).toBe(true);
    const reject = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 1 * BYTES_PER_MB, used: 300 * BYTES_PER_MB });
    expect(reject.ok).toBe(false);
  });

  it("countStorageUsage excludes DELETED assets so deletion reclaims quota", async () => {
    mockAggregate.mockResolvedValue({ _sum: { size: 7 * BYTES_PER_MB } });
    await countStorageUsage("t1");
    expect(mockAggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: "t1", status: { not: "DELETED" } } }));
  });
});
