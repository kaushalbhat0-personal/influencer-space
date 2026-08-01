import { describe, it, expect, beforeEach } from "vitest";
import { BuilderStore } from "@/lib/builder/store";
import {
  isPresentationKey,
  presentationDefaults,
  presentationPropsFor,
} from "@/lib/builder/presentation";
import { EMPTY_AGGREGATE, buildRuntimeSnapshot } from "@/lib/storefront/build-snapshot";

describe("PresentationBlueprint (Phase E) — builder never persists content", () => {
  it("content keys are NOT presentation keys", () => {
    expect(isPresentationKey("hero.default", "title")).toBe(false);
    expect(isPresentationKey("hero.default", "subtitle")).toBe(false);
    expect(isPresentationKey("products.grid", "name")).toBe(false);
    expect(isPresentationKey("about.default", "content")).toBe(false);
  });

  it("presentation keys ARE allowed", () => {
    expect(isPresentationKey("hero.default", "alignment")).toBe(true);
    expect(isPresentationKey("hero.default", "animation")).toBe(true);
    expect(isPresentationKey("products.grid", "columns")).toBe(true);
    expect(isPresentationKey("gallery.grid", "layout")).toBe(true);
    expect(isPresentationKey("footer.default", "minimal")).toBe(true);
  });

  it("presentationPropsFor strips content keys from a mixed config", () => {
    const result = presentationPropsFor("hero.default", {
      title: "Welcome",
      subtitle: "Hi",
      buttonText: "Go",
      alignment: "center",
      animation: "fade",
    });
    expect(result).toEqual({ alignment: "center", animation: "fade" });
    expect(result.title).toBeUndefined();
  });

  it("inserting a component seeds presentation-only config", () => {
    const store = new BuilderStore();
    const section = store.addSection("Hero");
    store.insertComponent("hero.default", section.id, 0);
    const page = store.activePage!;
    const slot = page.sections.find((s) => s.id === section.id)!.slots[0]!;
    expect(slot.moduleId).toBe("hero.default");
    expect(slot.config.alignment).toBeDefined();
    expect(slot.config.title).toBeUndefined();
    expect(slot.config.buttonText).toBeUndefined();
  });

  it("updateBlockConfig rejects content keys", () => {
    const store = new BuilderStore();
    const section = store.addSection("Hero");
    store.insertComponent("hero.default", section.id, 0);
    const page = store.activePage!;
    const slot = page.sections.find((s) => s.id === section.id)!.slots[0]!;

    store.updateBlockConfig(slot.id, "title", "HACKED");
    const afterContent = store.activePage!
      .sections.find((s) => s.id === section.id)!.slots[0]!.config;
    expect(afterContent.title).toBeUndefined();

    store.updateBlockConfig(slot.id, "alignment", "left");
    const afterPresentation = store.activePage!
      .sections.find((s) => s.id === section.id)!.slots[0]!.config;
    expect(afterPresentation.alignment).toBe("left");
  });
});

describe("Publish copies presentation only (Phase H) — content never baked", () => {
  it("EMPTY_AGGREGATE has no content", () => {
    expect(EMPTY_AGGREGATE.products).toEqual([]);
    expect(EMPTY_AGGREGATE.gallery).toEqual([]);
    expect(EMPTY_AGGREGATE.hero.title).toBe("");
    expect(EMPTY_AGGREGATE.identity.name).toBe("");
  });

  it("buildRuntimeSnapshot produces a full snapshot with live content", () => {
    const aggregate = {
      ...EMPTY_AGGREGATE,
      products: [{ id: "p1", name: "Poster", description: null, price: 999, imageUrl: null, images: [], slug: "poster", isFeatured: true, isActive: true }],
      hero: { title: "Hello", subtitle: "", description: "" },
    };
    const snapshot = buildRuntimeSnapshot({
      websiteId: "w1",
      correlationId: "c1",
      builderPages: [{ id: "p", name: "Home", slug: "/", order: 0, isHome: true, sections: [], theme: "default", metadata: {} }],
      aggregate,
      navItems: [],
      themePackageId: "com.creatos.neon-dark",
      themeColors: {},
      themeFonts: {},
    });
    expect(snapshot.layout.pages).toHaveLength(1);
    expect(snapshot.content.products).toHaveLength(1);
    expect(snapshot.theme.packageId).toBe("com.creatos.neon-dark");
  });
});
