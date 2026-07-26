/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getServerSession } from "next-auth";

const mockGetBuilderPages = vi.fn();
const mockSaveBuilderPages = vi.fn();
const mockPublishWebsite = vi.fn();

vi.mock("@/actions/builder.actions", () => ({
  loadBuilderPages: () => mockGetBuilderPages(),
  saveBuilderPages: (pages: unknown) => mockSaveBuilderPages(pages),
  publishWebsite: (pages: unknown) => mockPublishWebsite(pages),
}));

beforeEach(() => {
  vi.clearAllMocks();
  (getServerSession as any).mockResolvedValue({ user: { tenantId: "t1" } });
});

describe("builder actions", () => {
  it("getBuilderPages throws when unauthorized", async () => {
    (getServerSession as any).mockResolvedValue(null);
    const { getBuilderPages } = await import("../actions");
    await expect(getBuilderPages()).rejects.toThrow("Unauthorized");
  });

  it("saveBuilder throws when unauthorized", async () => {
    (getServerSession as any).mockResolvedValue(null);
    const { saveBuilder } = await import("../actions");
    await expect(saveBuilder([])).rejects.toThrow("Unauthorized");
  });

  it("publishBuilder throws when unauthorized", async () => {
    (getServerSession as any).mockResolvedValue(null);
    const { publishBuilder } = await import("../actions");
    await expect(publishBuilder([])).rejects.toThrow("Unauthorized");
  });

  it("saveBuilder calls underlying saveBuilderPages", async () => {
    mockSaveBuilderPages.mockResolvedValue({ success: true });
    const { saveBuilder } = await import("../actions");
    const result = await saveBuilder([]);
    expect(result.success).toBe(true);
  });

  it("publishBuilder calls underlying publishWebsite", async () => {
    mockPublishWebsite.mockResolvedValue({ success: true, version: 2 });
    const { publishBuilder } = await import("../actions");
    const result = await publishBuilder([]);
    expect(result.success).toBe(true);
  });
});
