import { describe, it, expect, vi } from "vitest";
import { seedStarterData } from "@/modules/tenant/application/seeder";
import type { Template } from "@/lib/template/registry";

function fullTemplate(): Template {
  return {
    id: "tpl",
    modules: {
      products: { enabled: true },
      gallery: { enabled: true },
      timeline: { enabled: true },
      links: { enabled: true },
    },
  } as unknown as Template;
}

describe("seedStarterData — RCCF-18: no fabricated manual starter content", () => {
  it("creates no product/gallery/timeline/affiliate rows for any manual template/strategy", async () => {
    const productCreate = vi.fn();
    const galleryCreate = vi.fn();
    const timelineCreate = vi.fn();
    const linkCreate = vi.fn();
    const tx = {
      product: { create: productCreate },
      galleryImage: { create: galleryCreate },
      timelineEvent: { create: timelineCreate },
      affiliateLink: { create: linkCreate },
    } as never;

    await seedStarterData(fullTemplate(), "t1", "balanced", "Creator", tx);
    await seedStarterData(fullTemplate(), "t1", "premium", "Creator", tx);
    await seedStarterData(fullTemplate(), "t1", "fast", "Creator", tx);

    expect(productCreate).not.toHaveBeenCalled();
    expect(galleryCreate).not.toHaveBeenCalled();
    expect(timelineCreate).not.toHaveBeenCalled();
    expect(linkCreate).not.toHaveBeenCalled();
  });
});
