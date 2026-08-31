// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { ProductsPage } from "@/features/products/components/products-page";
import {
  getProductTypeLabel,
  getCommerceModePresentation,
  getProductStatusPresentation,
} from "@/features/products/presentation";
import { PRODUCT_TYPE_REGISTRY } from "@/modules/product-types";
import { COMMERCE_MODES } from "@/config/commerce/commerce-mode";
import { productFormSchema } from "@/features/products/validators";
import type { ProductData } from "@/features/products/types";

// RCCF-70.4.4 — Creator Products Premium Creator OS implementation.
// Presentation-only assertions on the Products admin surface:
//   - canonical product-type registry is represented (audit fix)
//   - type/status/commerce display uses the canonical presentation helpers
//   - CRUD stays wired to the existing server actions (no new actions/data)
//   - no fabricated product data, no duplicate registries, no capability dup
//   - responsive/accessibility foundation preserved
// No frozen architecture (services, server actions, DB) is modified or asserted
// to behave differently.

// ── shims & mocks ───────────────────────────────────────────────────────────
const h = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/features/products/actions", () => ({
  createProduct: h.mockCreate,
  updateProduct: h.mockUpdate,
  deleteProduct: h.mockDelete,
}));

vi.mock("@/components/products/ImageManager", () => ({
  ImageManager: () => <div data-testid="image-manager" />,
}));

class NoopIO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
class NoopRO { observe() {} unobserve() {} disconnect() {} }

const PRODUCTS_SRC = "src/features/products/components/products-page.tsx";
const VALIDATORS_SRC = "src/features/products/validators.ts";

function makeProduct(overrides: Partial<ProductData> = {}): ProductData {
  return {
    id: "p1",
    name: "Pro Guide",
    description: "A downloadable guide",
    price: 999,
    imageUrl: null,
    images: [],
    slug: "pro-guide",
    status: "PUBLISHED",
    type: "digital",
    commerceMode: "ONLINE",
    isActive: true,
    isFeatured: false,
    seoTitle: null,
    seoDescription: null,
    order: 0,
    createdAt: new Date("2026-08-01T10:00:00.000Z"),
    updatedAt: new Date("2026-08-01T10:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  (globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
  (globalThis as Record<string, unknown>).ResizeObserver = NoopRO;
});

// ── Render: page + canonical display ────────────────────────────────────────
describe("RCCF-70.4.4 — products page renders (render)", () => {
  it("renders the page header and product rows", () => {
    render(<ProductsPage initialData={[makeProduct()]} tenantId="t1" />);
    expect(screen.getAllByText("Products").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Pro Guide")).toBeTruthy();
  });

  it("renders product type via the canonical display helper label", () => {
    render(<ProductsPage initialData={[makeProduct({ type: "digital" })]} tenantId="t1" />);
    expect(screen.getByText("Digital Product")).toBeTruthy();
  });

  it("renders every canonical product type label", () => {
    for (const def of PRODUCT_TYPE_REGISTRY) {
      cleanup();
      render(<ProductsPage initialData={[makeProduct({ type: def.id, name: `Item ${def.id}` })]} tenantId="t1" />);
      expect(screen.getByText(def.label)).toBeTruthy();
    }
  });

  it("falls back safely for an unknown product type", () => {
    render(<ProductsPage initialData={[makeProduct({ type: "unknown" as never, name: "Odd" })]} tenantId="t1" />);
    expect(screen.getByText("Odd")).toBeTruthy();
  });

  it("renders the ONLINE commerce mode distinctly", () => {
    render(<ProductsPage initialData={[makeProduct({ commerceMode: "ONLINE" })]} tenantId="t1" />);
    expect(screen.getByText("Online")).toBeTruthy();
  });

  it("renders the WHATSAPP commerce mode distinctly", () => {
    render(<ProductsPage initialData={[makeProduct({ commerceMode: "WHATSAPP" })]} tenantId="t1" />);
    expect(screen.getByText("WhatsApp")).toBeTruthy();
  });

  it("renders the BOTH commerce mode distinctly", () => {
    render(<ProductsPage initialData={[makeProduct({ commerceMode: "BOTH" })]} tenantId="t1" />);
    expect(screen.getByText("Online + WhatsApp")).toBeTruthy();
  });

  it("renders DRAFT/PUBLISHED/ARCHIVED statuses via canonical presentation", () => {
    for (const status of ["DRAFT", "PUBLISHED", "ARCHIVED"] as const) {
      cleanup();
      render(<ProductsPage initialData={[makeProduct({ status, name: `Item ${status}` })]} tenantId="t1" />);
      const p = getProductStatusPresentation(status);
      expect(screen.getByText(p.label)).toBeTruthy();
    }
  });

  it("preserves product fields in the table (name + formatted price)", () => {
    render(<ProductsPage initialData={[makeProduct({ name: "Premium Pack", price: 1999 })]} tenantId="t1" />);
    expect(screen.getByText("Premium Pack")).toBeTruthy();
    expect(screen.getByText("₹1,999")).toBeTruthy();
  });

  it("exposes edit and delete actions as visible controls", () => {
    render(<ProductsPage initialData={[makeProduct()]} tenantId="t1" />);
    expect(screen.getByLabelText("Edit Pro Guide")).toBeTruthy();
    expect(screen.getByLabelText("Delete Pro Guide")).toBeTruthy();
  });

  it("open create drawer exposes all canonical type options", () => {
    render(<ProductsPage initialData={[]} tenantId="t1" />);
    fireEvent.click(screen.getByText("Add Product"));
    const options = Array.from(document.querySelectorAll("select")).flatMap((s) =>
      Array.from(s.querySelectorAll("option")).map((o) => o.getAttribute("value")),
    );
    for (const def of PRODUCT_TYPE_REGISTRY) {
      expect(options).toContain(def.id);
    }
    expect(options).not.toContain("membership");
    expect(options).not.toContain("bundle");
  });
});

// ── Presentation helpers ────────────────────────────────────────────────────
describe("RCCF-70.4.4 — canonical presentation helpers (unit)", () => {
  it("maps every canonical type id to its registry label", () => {
    for (const def of PRODUCT_TYPE_REGISTRY) {
      expect(getProductTypeLabel(def.id)).toBe(def.label);
    }
  });

  it("covers all three commerce modes without inventing new ones", () => {
    expect(COMMERCE_MODES).toEqual(["ONLINE", "WHATSAPP", "BOTH"]);
    for (const mode of COMMERCE_MODES) {
      const p = getCommerceModePresentation(mode);
      expect(p.label.length).toBeGreaterThan(0);
      expect(["info", "cyan", "gold"]).toContain(p.badgeVariant);
    }
  });

  it("maps the repository status vocabulary deterministically", () => {
    expect(getProductStatusPresentation("PUBLISHED")).toEqual({ label: "Published", badgeVariant: "success" });
    expect(getProductStatusPresentation("DRAFT")).toEqual({ label: "Draft", badgeVariant: "warning" });
    expect(getProductStatusPresentation("ARCHIVED")).toEqual({ label: "Archived", badgeVariant: "default" });
  });
});

// ── Source truth: canonical registry / no fabricated data ───────────────────
describe("RCCF-70.4.4 — source truth (canonical registry + no fabrication)", () => {
  it("validator type enum derives from the canonical product-type registry", () => {
    const src = readFileSync(VALIDATORS_SRC, "utf8");
    expect(src).toContain('PRODUCT_TYPE_REGISTRY.map((t) => t.id)');
    expect(src).toContain("z.enum(PRODUCT_TYPE_IDS)");
    expect(src).not.toContain('"membership"');
    expect(src).not.toContain('"bundle"');
  });

  it("validator type enum covers every canonical type id at runtime", () => {
    for (const def of PRODUCT_TYPE_REGISTRY) {
      const result = productFormSchema.safeParse({ name: "Test", price: 0, type: def.id });
      expect(result.success, `type ${def.id} rejected`).toBe(true);
    }
  });

  it("registry is canonical: exactly the 7 standardized types", () => {
    const ids = PRODUCT_TYPE_REGISTRY.map((t) => t.id);
    expect(ids).toEqual(["digital", "physical", "course", "service", "booking", "affiliate", "donation"]);
  });

  it("contains no Stitch placeholder/fabricated product data", () => {
    const src = readFileSync(PRODUCTS_SRC, "utf8");
    for (const banned of ["₹9,999", "$999", "Bestseller", "4.9 rating", "1,284 reviews", "Trending now", "featured price"]) {
      expect(src).not.toContain(banned);
    }
  });

  it("does not duplicate the commerce mode vocabulary in the page", () => {
    const src = readFileSync(PRODUCTS_SRC, "utf8");
    expect(src).toContain("getCommerceModePresentation");
    // The page must not re-declare badge-variant semantics for modes.
    expect(src).not.toContain("badgeVariant: \"success\"");
    expect(src).not.toContain("badgeVariant: \"danger\"");
  });

  it("uses getProductTypeLabel + getProductStatusPresentation for display", () => {
    const src = readFileSync(PRODUCTS_SRC, "utf8");
    expect(src).toContain("getProductTypeLabel(d.type)");
    expect(src).toContain("getProductStatusPresentation(d.status)");
    expect(src).not.toContain("PRODUCT_TYPE_BY_ID");
  });
});

// ── Source truth: architecture preserved ────────────────────────────────────
describe("RCCF-70.4.4 — source truth (architecture)", () => {
  it("introduces no new server action and no new data source", () => {
    const src = readFileSync(PRODUCTS_SRC, "utf8");
    expect(src).not.toContain('"use server"');
    expect(src).not.toContain("prisma.");
    expect(src).not.toContain("@/generated/prisma");
    expect(src).not.toContain("fetch(");
  });

  it("keeps CRUD wired to the existing product actions only", () => {
    const src = readFileSync(PRODUCTS_SRC, "utf8");
    expect(src).toContain('createProduct, updateProduct, deleteProduct } from "../actions"');
    expect(src).toContain("await createProduct(form)");
    expect(src).toContain("await updateProduct(editing.id, form)");
    expect(src).toContain("await deleteProduct(id)");
  });

  it("does not duplicate capability/billing logic", () => {
    const src = readFileSync(PRODUCTS_SRC, "utf8");
    for (const banned of ["capabilityService", "filterNavForPlan", "creator_launch", "creator_grow", "creator_scale", "planCode", "resolveActivePlan", "FEATURE_IDS"]) {
      expect(src).not.toContain(banned);
    }
  });

  it("renders actions as always-visible buttons (not hover-only)", () => {
    const src = readFileSync(PRODUCTS_SRC, "utf8");
    // Buttons carry explicit aria-labels and are never gated behind group-hover.
    expect(src).toContain("aria-label={`Edit ${d.name}`}");
    expect(src).toContain("aria-label={`Delete ${d.name}`}");
    expect(src).not.toContain("group-hover:opacity-100");
  });

  it("keeps the responsive bounded-scroll table (no fixed min-width overflow)", () => {
    const src = readFileSync(PRODUCTS_SRC, "utf8");
    expect(src).toContain("<CrudTable");
    expect(src).not.toContain("min-w-[");
    // Shared CrudTable owns the overflow-x-auto wrapper for small screens.
    const tableSrc = readFileSync("src/features/_shared/components/crud-table.tsx", "utf8");
    expect(tableSrc).toContain("overflow-x-auto");
  });

  it("allows long product names to wrap instead of clipping", () => {
    const src = readFileSync(PRODUCTS_SRC, "utf8");
    // No whitespace-nowrap/truncate on the name cell forces horizontal clipping.
    expect(src).not.toContain("whitespace-nowrap");
    expect(src).not.toContain("truncate");
  });

  it("keeps all product form fields wired to the existing form state", () => {
    const src = readFileSync(PRODUCTS_SRC, "utf8");
    for (const field of ["form.name", "form.description", "form.price", "form.slug", "form.status", "form.type", "form.commerceMode", "form.images"]) {
      expect(src, `missing form field ${field}`).toContain(field);
    }
    expect(src).toContain("<ImageManager");
  });

  it("page route still fetches data server-side via the frozen service", () => {
    const routeSrc = readFileSync("src/app/admin/products/page.tsx", "utf8");
    expect(routeSrc).toContain('productService.list(tenantId)');
    expect(routeSrc).toContain('requireTenant()');
  });
});