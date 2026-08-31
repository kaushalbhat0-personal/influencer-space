import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPublished: Array<{
  tenant: { subdomain: string; name: string };
  brand: { name: string; bio: string; tagline: string } | null;
}> = [];

vi.mock("@/modules/tenant/infrastructure/website-repository", () => ({
  websiteRepository: {
    listPublished: vi.fn(() => Promise.resolve(mockPublished.map((p) => ({
      tenant: p.tenant,
      brand: p.brand,
    })))),
  },
}));

vi.mock("@/lib/config/platform", () => ({
  buildStorefrontUrl: (subdomain: string) => `https://${subdomain}.creatorspace.app`,
}));

import { showcaseService } from "@/modules/tenant/application/showcase.service";

beforeEach(() => {
  mockPublished.length = 0;
  vi.clearAllMocks();
});

describe("RCCF-SHOWCASE-01 — public showcase discovery", () => {
  it("eligible published site appears", async () => {
    mockPublished.push(
      { tenant: { subdomain: "spower-gaming", name: "SPower Gaming" }, brand: { name: "SPower Gaming", bio: "Gaming creator", tagline: "" } },
      { tenant: { subdomain: "mysticminutes17", name: "Mystic Minutes" }, brand: { name: "Mystic Minutes", bio: "Spiritual shorts", tagline: "" } }
    );
    const sites = await showcaseService.getPublished();
    expect(sites.length).toBe(2);
    expect(sites.some((s) => s.id === "spower-gaming")).toBe(true);
    expect(sites.some((s) => s.id === "mysticminutes17")).toBe(true);
  });

  it("non-published (draft) site does not appear", async () => {
    // mockPublished is empty → draft sites not in listPublished
    const sites = await showcaseService.getPublished();
    expect(sites.length).toBe(0);
  });

  it("tenant isolation — only live tenants returned", async () => {
    mockPublished.push(
      { tenant: { subdomain: "spower-gaming", name: "SPower Gaming" }, brand: { name: "SPower", bio: "", tagline: "" } }
    );
    // testcreator is draft, not in mockPublished
    const sites = await showcaseService.getPublished();
    expect(sites.every((s) => s.id !== "testcreator")).toBe(true);
    expect(sites[0].id).toBe("spower-gaming");
  });

  it("correct URL — CTA resolves to public storefront, not builder/preview", async () => {
    mockPublished.push(
      { tenant: { subdomain: "spower-gaming", name: "SPower Gaming" }, brand: { name: "SPower", bio: "", tagline: "" } }
    );
    const sites = await showcaseService.getPublished();
    expect(sites[0].storefrontUrl).toBe("https://spower-gaming.creatorspace.app");
    expect(sites[0].storefrontUrl).not.toContain("/builder");
    expect(sites[0].storefrontUrl).not.toContain("preview");
    expect(sites[0].storefrontUrl).not.toContain("/admin");
  });

  it("categories derived from published sites only", async () => {
    mockPublished.push(
      { tenant: { subdomain: "spower-gaming", name: "Game Studio" }, brand: { name: "Game Studio", bio: "", tagline: "" } }
    );
    const cats = await showcaseService.getCategories();
    // Game Studio → Gaming via inferCategory
    expect(cats).toContain("Gaming");
    // With no published, categories empty
    mockPublished.length = 0;
    const emptyCats = await showcaseService.getCategories();
    expect(emptyCats.length).toBe(0);
  });
});
