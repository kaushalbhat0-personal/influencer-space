// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProductsRenderer } from "@/lib/registry/components/renderers";

/* jsdom lacks IntersectionObserver / ResizeObserver used by framer-motion and
   nav components pulled in by the renderer tree. */
class NoopIO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
class NoopRO {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  cleanup();
  (globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
  (globalThis as Record<string, unknown>).ResizeObserver = NoopRO;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({ matches: false, media: q, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
});

const WHATSAPP_DEST = "https://wa.me/919876543210";

function product(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "p1",
    name: "Handmade Wallet",
    price: 1499,
    imageUrl: null,
    commerceMode: "ONLINE",
    whatsappUrl: WHATSAPP_DEST,
    ...overrides,
  };
}

function renderProducts(products: Array<Record<string, unknown>>, previewMode = false) {
  render(
    <ProductsRenderer
      props={{ resolvedData: products, resolvedTitle: "Products", columns: 3 }}
      previewMode={previewMode}
    />,
  );
}

describe("RCCF-66.2 — ProductsRenderer CTA behavior", () => {
  it("ONLINE renders Buy Now only (no WhatsApp)", () => {
    renderProducts([product({ commerceMode: "ONLINE" })]);
    expect(screen.getByRole("button", { name: /buy now/i })).toBeTruthy();
    expect(screen.queryByText("Order on WhatsApp")).toBeNull();
  });

  it("WHATSAPP renders Order on WhatsApp only (no Buy Now)", () => {
    renderProducts([product({ commerceMode: "WHATSAPP" })]);
    const link = screen.getByRole("link", { name: /order on whatsapp/i });
    expect(link).toBeTruthy();
    expect(screen.queryByRole("button", { name: /buy now/i })).toBeNull();
  });

  it("BOTH renders Buy Now and Order on WhatsApp", () => {
    renderProducts([product({ commerceMode: "BOTH" })]);
    expect(screen.getByRole("button", { name: /buy now/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /order on whatsapp/i })).toBeTruthy();
  });

  it("WHATSAPP with no valid destination renders no broken link", () => {
    renderProducts([product({ commerceMode: "WHATSAPP", whatsappUrl: null })]);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText("Order on WhatsApp")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /buy now/i })).toBeNull();
  });

  it("BOTH with no valid destination still renders Buy Now", () => {
    renderProducts([product({ commerceMode: "BOTH", whatsappUrl: null })]);
    expect(screen.getByRole("button", { name: /buy now/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /order on whatsapp/i })).toBeNull();
  });

  it("preview mode does not trigger live WhatsApp navigation (inert CTA)", () => {
    renderProducts([product({ commerceMode: "WHATSAPP" })], true);
    // No clickable wa.me link in preview — only a disabled button.
    expect(screen.queryByRole("link")).toBeNull();
    const btn = screen.getByRole("button", { name: /order on whatsapp/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("WhatsApp CTA uses target=_blank + rel=noopener noreferrer", () => {
    renderProducts([product({ commerceMode: "WHATSAPP" })]);
    const link = screen.getByRole("link", { name: /order on whatsapp/i }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("legacy product without commerceMode degrades to ONLINE (Buy Now only)", () => {
    const legacy = product({});
    delete legacy.commerceMode;
    renderProducts([legacy]);
    expect(screen.getByRole("button", { name: /buy now/i })).toBeTruthy();
    expect(screen.queryByText("Order on WhatsApp")).toBeNull();
  });
});

describe("RCCF-67.2 — live-preview commerce isolation (ProductsRenderer)", () => {
  it("ONLINE in preview renders an inert Buy Now (disabled, not actionable)", () => {
    renderProducts([product({ commerceMode: "ONLINE" })], true);
    const btn = screen.getByRole("button", { name: /checkout available on your live website/i }) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(true);
    expect(screen.queryByRole("button", { name: /^buy now$/i })).toBeNull();
  });

  it("WHATSAPP in preview renders an inert CTA and no wa.me link", () => {
    renderProducts([product({ commerceMode: "WHATSAPP" })], true);
    expect(screen.queryByRole("link")).toBeNull();
    const btn = screen.getByRole("button", { name: /order on whatsapp/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("BOTH in preview renders both CTAs inert (no actionable link/checkout)", () => {
    renderProducts([product({ commerceMode: "BOTH" })], true);
    expect(screen.queryByRole("link")).toBeNull();
    const buy = screen.getByRole("button", { name: /checkout available on your live website/i }) as HTMLButtonElement;
    expect(buy.disabled).toBe(true);
    const wa = screen.getByRole("button", { name: /order on whatsapp/i }) as HTMLButtonElement;
    expect(wa.disabled).toBe(true);
  });

  it("normal published storefront still renders an actionable Buy Now", () => {
    renderProducts([product({ commerceMode: "ONLINE" })], false);
    const btn = screen.getByRole("button", { name: /buy now/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});
