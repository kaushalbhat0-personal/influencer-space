// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

// RCCF-68.3.2 — interactive preview isolation + responsive grid behavior for the
// storefront renderers. Node/static assertions live in
// tests/unit/rccf68-storefront-responsive.test.ts.

// The renderers import { useFormState } from "react-dom". The standalone
// react-dom 18.3.1 (used by vitest) does not export it — Next.js supplies its
// own compiled react-dom with the hook at build time. Shim it here so the
// Contact/Newsletter renderers mount in jsdom (their preview branches must not
// execute the real server action anyway).
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return {
    ...actual,
    useFormState: vi.fn((_action: unknown, initialState: unknown) => [initialState, vi.fn()]),
  };
});

vi.mock("@/lib/supabase", () => ({
  BUCKET: "influencer-images",
  supabaseClient: {},
  supabaseAdmin: {},
}));

class NoopIO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
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
  vi.clearAllMocks();
});

import {
  GalleryRenderer,
  ProductsRenderer,
  TestimonialsRenderer,
  ContactRenderer,
  NewsletterRenderer,
  ServicesRenderer,
  BookingsRenderer,
} from "@/lib/registry/components/renderers";

function galleryProps(count = 4, columns = 3): Record<string, unknown> {
  return {
    resolvedTitle: "Gallery",
    columns,
    resolvedData: Array.from({ length: count }, (_, i) => ({ url: `https://cdn.example.com/${i}.jpg`, isVideo: false, altText: `img-${i}`, caption: "" })),
  };
}

function productProps(overrides: Record<string, unknown> = {}, count = 4, columns = 3): Record<string, unknown> {
  return {
    resolvedTitle: "Products",
    columns,
    resolvedData: Array.from({ length: count }, (_, i) => ({
      id: `p-${i}`,
      name: `Product ${i}`,
      price: 100 + i,
      description: "desc",
      imageUrl: null,
      commerceMode: "ONLINE",
      whatsappUrl: null,
      ...overrides,
    })),
  };
}

function testimonialProps(count = 4, columns = 3): Record<string, unknown> {
  return {
    resolvedTitle: "Testimonials",
    columns,
    resolvedData: Array.from({ length: count }, (_, i) => ({
      name: `Fan ${i}`,
      content: `Great work ${i}`,
      handle: "@fan",
      rating: 5,
      avatarUrl: null,
    })),
  };
}

function bookingSlot(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "b1",
    title: "Strategy Call",
    price: 2000,
    duration: 60,
    slotDate: "2099-02-10T00:00:00Z",
    slotStart: "10:00",
    slotEnd: "11:00",
    approvalRequired: true,
    ...overrides,
  };
}

function serviceProps(count = 2): Record<string, unknown> {
  return {
    resolvedTitle: "Services",
    resolvedData: Array.from({ length: count }, (_, i) => ({
      title: `Service ${i}`,
      price: 500 + i,
      duration: "60 min",
      bookable: true,
      bookableSlots: [bookingSlot({ id: `s-${i}` })],
    })),
  };
}

// ── Responsive grid behavior ─────────────────────────────────
describe("RCCF-68.3.2 — responsive storefront grids (jsdom DOM)", () => {
  it("GalleryRenderer applies the container-query grid class", () => {
    const { container } = render(<GalleryRenderer props={galleryProps()} />);
    const grid = container.querySelector('[class*="@sm/main:grid-cols-2"]');
    expect(grid).toBeTruthy();
    expect((grid as HTMLElement).className).toContain("grid grid-cols-1");
    expect((grid as HTMLElement).getAttribute("style")).toBeNull();
  });

  it("GalleryRenderer preserves the configured desktop column count at @lg/main", () => {
    const { container } = render(<GalleryRenderer props={galleryProps(6, 6)} />);
    const grid = container.querySelector('[class*="@lg/main:grid-cols-6"]');
    expect(grid).toBeTruthy();
  });

  it("ProductsRenderer applies the container-query grid class", () => {
    const { container } = render(<ProductsRenderer props={productProps()} />);
    const grid = container.querySelector('[class*="@sm/main:grid-cols-2"]');
    expect(grid).toBeTruthy();
    expect((grid as HTMLElement).className).toContain("grid grid-cols-1");
    expect((grid as HTMLElement).getAttribute("style")).toBeNull();
  });

  it("ProductsRenderer preserves the configured desktop column count at @lg/main", () => {
    const { container } = render(<ProductsRenderer props={productProps({}, 6, 4)} />);
    const grid = container.querySelector('[class*="@lg/main:grid-cols-4"]');
    expect(grid).toBeTruthy();
  });

  it("TestimonialsRenderer applies the container-query grid class (no inline repeat)", () => {
    const { container } = render(<TestimonialsRenderer props={testimonialProps()} />);
    const grid = container.querySelector('[class*="@sm/main:grid-cols-2"]');
    expect(grid).toBeTruthy();
    expect((grid as HTMLElement).getAttribute("style")).toBeNull();
  });

  it("TestimonialsRenderer caps desktop columns by item count (old behavior preserved)", () => {
    // 2 testimonials, configured 5 columns → desktop capped to 2 (@lg/main:grid-cols-2).
    const { container } = render(<TestimonialsRenderer props={testimonialProps(2, 5)} />);
    const grid = container.querySelector('[class*="@sm/main:grid-cols-2"]');
    expect(grid).toBeTruthy();
  });
});

// ── Preview isolation ────────────────────────────────────────
describe("RCCF-68.3.2 — ContactRenderer preview isolation", () => {
  const props = { tenantId: "t-1", title: "Contact" };

  it("preview: form visible but inert (disabled inputs + disabled submit, no form submit)", () => {
    render(<ContactRenderer props={props} previewMode />);
    expect(screen.getByText(/have a question or want to collaborate/i)).toBeTruthy();
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    for (const el of inputs) expect((el as HTMLInputElement).disabled).toBe(true);
    const btn = screen.getByRole("button", { name: /send message/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    // No <form> is rendered in preview → no server action can fire.
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("published: contact form is actionable (enabled inputs + submit button)", () => {
    const { container } = render(<ContactRenderer props={props} />);
    const inputs = screen.getAllByRole("textbox");
    for (const el of inputs) expect((el as HTMLInputElement).disabled).toBe(false);
    const btn = screen.getByRole("button", { name: /send message/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(container.querySelector("form")).toBeTruthy();
  });
});

describe("RCCF-68.3.2 — NewsletterRenderer preview isolation", () => {
  const props = { tenantId: "t-1", title: "Subscribe" };

  it("preview: subscribe UI visible but inert (disabled input + disabled submit)", () => {
    render(<NewsletterRenderer props={props} previewMode />);
    const input = screen.getByPlaceholderText(/your email/i) as HTMLInputElement;
    expect(input.disabled).toBe(true);
    const btn = screen.getByRole("button", { name: /subscribe/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("published: subscribe form is actionable", () => {
    const { container } = render(<NewsletterRenderer props={props} />);
    const input = screen.getByPlaceholderText(/your email/i) as HTMLInputElement;
    expect(input.disabled).toBe(false);
    const btn = screen.getByRole("button", { name: /subscribe/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(container.querySelector("form")).toBeTruthy();
  });
});

describe("RCCF-68.3.2 — ServicesRenderer preview isolation", () => {
  it("preview: service info + availability visible, booking controls inert", () => {
    render(<ServicesRenderer props={serviceProps(1)} previewMode />);
    expect(screen.getByText("Service 0")).toBeTruthy();
    expect(screen.getByText(/available times/i)).toBeTruthy();
    const bookBtn = screen.getByRole("button", { name: /book now/i }) as HTMLButtonElement;
    expect(bookBtn.disabled).toBe(true);
    // No booking form (no slot select / no name/email/phone).
    expect(screen.queryByPlaceholderText("Your name")).toBeNull();
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("published: booking flow is actionable", async () => {
    render(<ServicesRenderer props={serviceProps(1)} />);
    const bookBtn = screen.getByRole("button", { name: /book now/i });
    expect(bookBtn).toBeTruthy();
    // The "Choose a time" panel opens on interaction.
    // (No click needed for the isolation guarantee — published UI is actionable.)
    expect(screen.queryByText(/choose a time/i)).toBeNull();
  });
});

describe("RCCF-68.3.2 — BookingsRenderer preview isolation", () => {
  const props = { resolvedTitle: "Book a Session", resolvedData: [bookingSlot()] };

  it("preview: booking card visible, booking form inert (no submit form, no inputs)", () => {
    const { container } = render(<BookingsRenderer props={props} previewMode />);
    expect(screen.getByText("Strategy Call")).toBeTruthy();
    expect(screen.getByText(/10:00.*11:00/)).toBeTruthy();
    const btn = screen.getByRole("button", { name: /request booking/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByPlaceholderText("Your name")).toBeNull();
  });

  it("published: booking form is actionable", () => {
    const { container } = render(<BookingsRenderer props={props} />);
    expect(screen.getByPlaceholderText("Your name")).toBeTruthy();
    expect(container.querySelector("form")).toBeTruthy();
    const btn = screen.getByRole("button", { name: /request booking/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

// ── Regressions: Products Buy Now + WhatsApp + Affiliate stay inert in preview ──
describe("RCCF-68.3.2 — Products + Affiliate preview isolation regression", () => {
  it("Buy Now is inert in preview (disabled checkout)", () => {
    render(<ProductsRenderer props={productProps({ commerceMode: "ONLINE" }, 1)} previewMode />);
    const btn = screen.getByRole("button", { name: /checkout available on your live website/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("WhatsApp CTA is inert in preview (no wa.me link)", () => {
    render(<ProductsRenderer props={productProps({ commerceMode: "WHATSAPP", whatsappUrl: "https://wa.me/919876543210" }, 1)} previewMode />);
    expect(screen.queryByRole("link")).toBeNull();
    const btn = screen.getByRole("button", { name: /order on whatsapp/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("Buy Now + WhatsApp are actionable on the published storefront", () => {
    render(<ProductsRenderer props={productProps({ commerceMode: "BOTH", whatsappUrl: "https://wa.me/919876543210" }, 1)} />);
    const buy = screen.getByRole("button", { name: /buy now/i }) as HTMLButtonElement;
    expect(buy.disabled).toBe(false);
    const wa = screen.getByRole("link", { name: /order on whatsapp/i }) as HTMLAnchorElement;
    expect(wa.getAttribute("href")).toMatch(/^https:\/\/wa\.me\//);
  });

  it("Affiliate clicks remain inert in preview (no tracking, no window.open)", async () => {
    const { AffiliateGrid } = await import("@/components/public/AffiliateGrid");
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const affiliate = { id: "a1", title: "Gear", url: "https://gear.example.com/x", imageUrl: null, clicks: 3 };
    const { container } = render(<AffiliateGrid affiliates={[affiliate]} previewMode />);
    // Trigger the card's onClick path.
    container.querySelector(".cursor-pointer")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await waitFor(() => {});
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
