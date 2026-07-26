import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSettingFindUnique, mockSettingUpsert } = vi.hoisted(() => ({
  mockSettingFindUnique: vi.fn(),
  mockSettingUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    setting: {
      findUnique: mockSettingFindUnique,
      upsert: mockSettingUpsert,
    },
  },
}));

import { seoService } from "../service";

beforeEach(() => { vi.clearAllMocks(); });

describe("SEO service", () => {
  it("get returns defaults when no setting", async () => {
    mockSettingFindUnique.mockResolvedValue(null);
    const result = await seoService.get("t1");
    expect(result.title).toBeNull();
    expect(result.indexingEnabled).toBe(true);
  });

  it("get returns parsed seo data", async () => {
    mockSettingFindUnique.mockResolvedValue({ key: "seo", value: { title: "My Store", description: "Best", indexingEnabled: false } });
    const result = await seoService.get("t1");
    expect(result.title).toBe("My Store");
    expect(result.indexingEnabled).toBe(false);
  });

  it("update merges with existing data", async () => {
    mockSettingFindUnique.mockResolvedValue({ key: "seo", value: { title: "Old", indexingEnabled: true } });
    mockSettingUpsert.mockResolvedValue({});
    const result = await seoService.update("t1", { title: "New Title" });
    expect(result.title).toBe("New Title");
    expect(result.indexingEnabled).toBe(true);
  });

  it("update creates setting when none exists", async () => {
    mockSettingFindUnique.mockResolvedValue(null);
    mockSettingUpsert.mockResolvedValue({});
    const result = await seoService.update("t1", { title: "Brand New", indexingEnabled: true });
    expect(result.title).toBe("Brand New");
  });

  it("update handles empty input", async () => {
    mockSettingFindUnique.mockResolvedValue({ key: "seo", value: { title: "Existing" } });
    mockSettingUpsert.mockResolvedValue({});
    const result = await seoService.update("t1", {});
    expect(result.title).toBe("Existing");
  });
});
