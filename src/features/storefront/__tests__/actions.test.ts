/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { website: { findUnique: vi.fn() }, tenant: { findFirst: vi.fn() } },
}));

import { getServerSession } from "next-auth";

beforeEach(() => {
  vi.clearAllMocks();
  (getServerSession as any).mockResolvedValue({ user: { tenantId: "t1" } });
});

describe("getVersions", () => {
  it("throws when unauthorized", async () => {
    (getServerSession as any).mockResolvedValue(null);
    const { getVersions } = await import("../actions");
    await expect(getVersions()).rejects.toThrow("Unauthorized");
  });

  it("returns empty array when no website", async () => {
    const { prisma } = await import("@/lib/prisma");
    (prisma.website.findUnique as any).mockResolvedValue(null);
    const { getVersions } = await import("../actions");
    const result = await getVersions();
    expect(result).toEqual([]);
  });
});

describe("getVersionDetail", () => {
  it("throws when unauthorized", async () => {
    (getServerSession as any).mockResolvedValue(null);
    const { getVersionDetail } = await import("../actions");
    await expect(getVersionDetail(1)).rejects.toThrow("Unauthorized");
  });

  it("returns null when no website", async () => {
    const { prisma } = await import("@/lib/prisma");
    (prisma.website.findUnique as any).mockResolvedValue(null);
    const { getVersionDetail } = await import("../actions");
    const result = await getVersionDetail(1);
    expect(result).toBeNull();
  });
});

describe("rollbackTo", () => {
  it("throws when unauthorized", async () => {
    (getServerSession as any).mockResolvedValue(null);
    const { rollbackTo } = await import("../actions");
    await expect(rollbackTo(1)).rejects.toThrow("Unauthorized");
  });

  it("returns false when no website", async () => {
    const { prisma } = await import("@/lib/prisma");
    (prisma.website.findUnique as any).mockResolvedValue(null);
    const { rollbackTo } = await import("../actions");
    const result = await rollbackTo(1);
    expect(result).toBe(false);
  });
});

describe("getStorefrontData", () => {
  it("returns null when tenant not found", async () => {
    const { prisma } = await import("@/lib/prisma");
    (prisma.tenant.findFirst as any).mockResolvedValue(null);
    const { getStorefrontData } = await import("../actions");
    const result = await getStorefrontData("unknown.com");
    expect(result).toBeNull();
  });
});
