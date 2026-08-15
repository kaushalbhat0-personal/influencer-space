import { describe, it, expect, vi } from "vitest";

// ── RCCF-66.2 — Creator WhatsApp Commerce (per-product sales mode) ─────────
// Thin CTA channel over the existing commerce architecture. No order system,
// no Razorpay, no quota consumption.

const h = vi.hoisted(() => ({
  mockProductFindMany: vi.fn(),
  mockProductCreate: vi.fn(),
  mockProductUpdate: vi.fn(),
  mockProductFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: h.mockProductFindMany,
      create: h.mockProductCreate,
      update: h.mockProductUpdate,
      findFirst: h.mockProductFindFirst,
    },
  },
}));
vi.mock("@/modules/tenant/infrastructure/product-repository", () => ({
  productRepository: { findPublished: vi.fn(), findFeatured: vi.fn(), findNonFeatured: vi.fn() },
}));
vi.mock("@/services/settings.service", () => ({
  SettingsService: { getHeroData: vi.fn(), getSeo: vi.fn(), getSettingByKey: vi.fn() },
}));

import {
  DEFAULT_COMMERCE_MODE,
  COMMERCE_MODES,
  isCommerceMode,
  normalizeCommerceMode,
} from "@/config/commerce/commerce-mode";
import { productFormSchema } from "@/features/products/validators";
import { productService } from "@/features/products/service";
import {
  buildWhatsAppMessage,
  buildWaMeLink,
  extractWhatsAppNumber,
  resolveWhatsAppDestination,
} from "@/lib/commerce/whatsapp";
import { LayoutEngine } from "@/lib/storefront/layout-engine/LayoutEngine";
import {
  type PublishedSnapshot,
  CURRENT_SNAPSHOT_VERSION,
  SNAPSHOT_SCHEMA,
} from "@/types/snapshot";

const engine = new LayoutEngine();

function snapshotWith(products: Array<Record<string, unknown>>): PublishedSnapshot {
  return {
    _schema: SNAPSHOT_SCHEMA,
    _version: CURRENT_SNAPSHOT_VERSION,
    metadata: { version: 1, publishedAt: "2026-01-01T00:00:00Z", previousVersion: null, correlationId: "r66", generatedBy: "dashboard" },
    content: {
      identity: { name: "Creator", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
      hero: { title: "Hi", subtitle: "", description: "" },
      products: products.map((p) => ({
        id: String(p.id),
        name: String(p.name),
        description: null,
        price: Number(p.price ?? 0),
        imageUrl: null,
        images: [],
        slug: String(p.slug ?? ""),
        isFeatured: false,
        isActive: true,
        commerceMode: p.commerceMode as string | undefined,
        whatsappUrl: (p.whatsappUrl as string | null | undefined) ?? null,
      })),
      gallery: [],
      links: [],
      seo: { title: "", description: "" },
    },
    layout: {
      pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: [{ id: "s1", moduleId: "products.grid", config: {}, order: 0, visible: true }] }],
    },
    theme: {
      packageId: "neon-dark",
      colors: { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa" },
      typography: { heading: "Inter", body: "Inter" },
    },
    navigation: [],
    renderingHints: {},
  };
}

describe("RCCF-66.2 — data model / default", () => {
  it("Product.commerceMode defaults to ONLINE", () => {
    expect(DEFAULT_COMMERCE_MODE).toBe("ONLINE");
    expect(COMMERCE_MODES).toEqual(["ONLINE", "WHATSAPP", "BOTH"]);
  });

  it("legacy / missing / invalid modes normalize to ONLINE (existing products unchanged)", () => {
    expect(normalizeCommerceMode(undefined)).toBe("ONLINE");
    expect(normalizeCommerceMode(null)).toBe("ONLINE");
    expect(normalizeCommerceMode("")).toBe("ONLINE");
    expect(normalizeCommerceMode("GARBAGE")).toBe("ONLINE");
    expect(isCommerceMode("ONLINE")).toBe(true);
    expect(isCommerceMode("WHATSAPP")).toBe(true);
    expect(isCommerceMode("BOTH")).toBe(true);
    expect(isCommerceMode("OTHER")).toBe(false);
  });
});

describe("RCCF-66.2 — validation (productFormSchema)", () => {
  it("accepts ONLINE", () => {
    expect(productFormSchema.safeParse({ name: "P", price: 10, type: "digital", commerceMode: "ONLINE" }).success).toBe(true);
  });
  it("accepts WHATSAPP", () => {
    expect(productFormSchema.safeParse({ name: "P", price: 10, type: "physical", commerceMode: "WHATSAPP" }).success).toBe(true);
  });
  it("accepts BOTH", () => {
    expect(productFormSchema.safeParse({ name: "P", price: 10, type: "service", commerceMode: "BOTH" }).success).toBe(true);
  });
  it("rejects invalid / arbitrary / null modes", () => {
    for (const bad of ["UNKNOWN", "ONLINE_PLUS", "whatsapp", "BOTH "]) {
      expect(productFormSchema.safeParse({ name: "P", price: 10, type: "digital", commerceMode: bad }).success).toBe(false);
    }
  });
  it("omitted mode is allowed (defaults ONLINE at the service/DB layer)", () => {
    expect(productFormSchema.safeParse({ name: "P", price: 10, type: "digital" }).success).toBe(true);
  });
});

describe("RCCF-66.2 — service passthrough", () => {
  it("maps commerceMode from the row (defaults ONLINE for legacy rows)", async () => {
    const row = { id: "1", name: "P", price: 100, status: "PUBLISHED", isActive: true, images: [], order: 0, tenantId: "t1", description: null, imageUrl: null, slug: "p", isFeatured: false, seoTitle: null, seoDescription: null, createdAt: new Date(), updatedAt: new Date() };
    h.mockProductFindMany.mockResolvedValue([{ ...row, commerceMode: "WHATSAPP" }]);
    const [mapped] = await productService.list("t1");
    expect(mapped.commerceMode).toBe("WHATSAPP");

    h.mockProductFindMany.mockResolvedValue([row]);
    const [legacy] = await productService.list("t1");
    expect(legacy.commerceMode).toBe("ONLINE");
  });

  it("persists commerceMode on create and update", async () => {
    h.mockProductCreate.mockResolvedValue({ id: "1", name: "P", price: 10, commerceMode: "BOTH", status: "PUBLISHED", type: "digital", isActive: true, isFeatured: false, images: [], order: 0, tenantId: "t1", description: null, imageUrl: null, slug: "p", seoTitle: null, seoDescription: null, createdAt: new Date(), updatedAt: new Date() });
    const created = await productService.create("t1", { name: "P", price: 10, type: "digital", commerceMode: "BOTH" });
    expect(created.commerceMode).toBe("BOTH");
    expect(h.mockProductCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ commerceMode: "BOTH" }) }));

    h.mockProductFindFirst.mockResolvedValue({ id: "1" });
    h.mockProductUpdate.mockResolvedValue({ id: "1", name: "P", price: 10, commerceMode: "WHATSAPP", status: "PUBLISHED", type: "digital", isActive: true, isFeatured: false, images: [], order: 0, tenantId: "t1", description: null, imageUrl: null, slug: "p", seoTitle: null, seoDescription: null, createdAt: new Date(), updatedAt: new Date() });
    const updated = await productService.update("1", "t1", { commerceMode: "WHATSAPP" });
    expect(updated.commerceMode).toBe("WHATSAPP");
    expect(h.mockProductUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ commerceMode: "WHATSAPP" }) }));
  });
});

describe("RCCF-66.2 — aggregate / snapshot pipeline (LayoutEngine passthrough)", () => {
  it("commerceMode + whatsappUrl reach the section resolvedData", () => {
    const snap = snapshotWith([
      { id: "p1", name: "Wallet", price: 1499, slug: "wallet", commerceMode: "WHATSAPP", whatsappUrl: "https://wa.me/919876543210" },
    ]);
    const doc = engine.resolve(snap);
    const section = doc.pages[0].sections.find((s) => s.moduleId === "products.grid");
    const data = (section?.config.resolvedData as Array<Record<string, unknown>>) ?? [];
    expect(data[0].commerceMode).toBe("WHATSAPP");
    expect(data[0].whatsappUrl).toBe("https://wa.me/919876543210");
    // Existing product fields are preserved.
    expect(data[0].name).toBe("Wallet");
    expect(data[0].price).toBe(1499);
  });

  it("legacy snapshot without commerceMode still resolves (renderer normalizes to ONLINE)", () => {
    const snap = snapshotWith([{ id: "p1", name: "Poster", price: 999, slug: "poster" }]);
    const doc = engine.resolve(snap);
    const section = doc.pages[0].sections.find((s) => s.moduleId === "products.grid");
    const data = (section?.config.resolvedData as Array<Record<string, unknown>>) ?? [];
    expect(data[0].commerceMode).toBeUndefined();
    expect(data[0].whatsappUrl).toBeNull();
    expect(normalizeCommerceMode(data[0].commerceMode)).toBe("ONLINE");
  });
});

describe("RCCF-66.2 — WhatsApp destination resolution (hero socialLinks)", () => {
  it("resolves the whatsapp link from hero socialLinks", () => {
    const dest = resolveWhatsAppDestination([
      { platform: "youtube", url: "https://youtube.com/@c" },
      { platform: "whatsapp", url: "https://wa.me/919876543210" },
    ]);
    expect(dest).toBe("https://wa.me/919876543210");
  });

  it("returns '' when no whatsapp social link exists", () => {
    expect(resolveWhatsAppDestination([{ platform: "email", url: "mailto:a@b.c" }])).toBe("");
    expect(resolveWhatsAppDestination([])).toBe("");
    expect(resolveWhatsAppDestination(null)).toBe("");
    expect(resolveWhatsAppDestination(undefined)).toBe("");
  });

  it("returns '' for a non-wa.me whatsapp entry (no fabricated destination)", () => {
    expect(resolveWhatsAppDestination([{ platform: "whatsapp", url: "https://example.com/not-wa" }])).toBe("");
  });
});

describe("RCCF-66.2 — WhatsApp URL helper (buildWaMeLink)", () => {
  it("accepts a wa.me URL with protocol", () => {
    // `!` is in the unreserved set — encodeURIComponent leaves it as-is.
    expect(buildWaMeLink("https://wa.me/919876543210", "Hi!")).toBe("https://wa.me/919876543210?text=Hi!");
  });

  it("accepts a protocol-less wa.me URL", () => {
    expect(buildWaMeLink("wa.me/919876543210", "Hello")).toBe("https://wa.me/919876543210?text=Hello");
  });

  it("accepts a bare number and normalizes", () => {
    expect(buildWaMeLink("+91 98765 43210", "Hi")).toBe("https://wa.me/919876543210?text=Hi");
    expect(extractWhatsAppNumber("+91 98765 43210")).toBe("919876543210");
  });

  it("URL-encodes the message", () => {
    const link = buildWaMeLink("https://wa.me/919876543210", "Hi! I'd like to order: Wallet\nPrice: ₹1,499\nhttps://example.com/wallet");
    expect(link).toContain("text=");
    expect(link).not.toContain("\n");
    expect(link).not.toContain("₹");
  });

  it("buildWhatsAppMessage includes product name, price and URL", () => {
    const msg = buildWhatsAppMessage({ productName: "Handmade Leather Wallet", price: "₹1,499", productUrl: "https://example.com/wallet" });
    expect(msg).toContain("Handmade Leather Wallet");
    expect(msg).toContain("₹1,499");
    expect(msg).toContain("https://example.com/wallet");
    expect(msg).toContain("Hi! I'd like to order:");
  });

  it("rejects javascript:", () => {
    expect(buildWaMeLink("javascript:alert(1)", "Hi")).toBe("");
    expect(extractWhatsAppNumber("javascript:alert(1)")).toBe("");
  });

  it("rejects data:", () => {
    expect(buildWaMeLink("data:text/html,<script>alert(1)</script>", "Hi")).toBe("");
  });

  it("rejects unsupported protocols (file:, ftp:)", () => {
    expect(buildWaMeLink("file:///etc/passwd", "Hi")).toBe("");
    expect(buildWaMeLink("ftp://wa.me/919876543210", "Hi")).toBe("");
  });

  it("rejects malformed / non-wa.me destinations", () => {
    expect(buildWaMeLink("", "Hi")).toBe("");
    expect(buildWaMeLink("https://example.com", "Hi")).toBe("");
    expect(buildWaMeLink("not a url at all", "Hi")).toBe("");
    expect(buildWaMeLink("https://wa.me/123", "Hi")).toBe("");
  });
});
