// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getProductTypeLabel,
  getCommerceModePresentation,
  getProductStatusPresentation,
} from "@/features/products/presentation";
import { PRODUCT_TYPE_REGISTRY } from "@/modules/product-types";
import { COMMERCE_MODES } from "@/config/commerce/commerce-mode";

// RCCF-70.4.2 — Premium Creator OS shared presentation primitives.
// Pins the canonical token-class button mapping, the product presentation
// helpers (type label / commerce mode / status), and verifies the existing
// Badge primitive stays intact. No database, no server actions, no capabilities.

afterEach(() => cleanup());

describe("RCCF-70.4.2 — Button presentation variants", () => {
  it("default variant maps to the canonical btn-primary token class", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.className).toContain("btn-primary");
    expect(button.className).not.toContain("bg-indigo-600");
  });

  it("destructive variant maps to btn-danger", () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain("btn-danger");
  });

  it("outline variant maps to btn-secondary", () => {
    render(<Button variant="outline">Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" }).className).toContain("btn-secondary");
  });

  it("ghost variant maps to btn-ghost", () => {
    render(<Button variant="ghost">Reset</Button>);
    expect(screen.getByRole("button", { name: "Reset" }).className).toContain("btn-ghost");
  });

  it("size variants apply px/py/text-size utilities", () => {
    render(<Button size="sm">Small</Button>);
    const sm = screen.getByRole("button", { name: "Small" });
    expect(sm.className).toContain("px-3");
    expect(sm.className).toContain("py-1.5");
    expect(sm.className).toContain("text-xs");

    cleanup();
    render(<Button size="lg">Large</Button>);
    const lg = screen.getByRole("button", { name: "Large" });
    expect(lg.className).toContain("px-6");
    expect(lg.className).toContain("py-3");
    expect(lg.className).toContain("text-base");
  });

  it("keeps consistent disabled + focus-visible interaction classes", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button.className).toContain("disabled:cursor-not-allowed");
    expect(button.className).toContain("disabled:opacity-50");
    expect(button.className).toContain("inline-flex");
  });

  it("preserves button semantics: type/onClick pass through unchanged", () => {
    let clicked = false;
    render(<Button type="button" onClick={() => (clicked = true)}>Click</Button>);
    const button = screen.getByRole("button", { name: "Click" });
    expect(button.getAttribute("type")).toBe("button");
    button.click();
    expect(clicked).toBe(true);
  });
});

describe("RCCF-70.4.2 — Product type display label", () => {
  it("maps internal type ids to canonical registry labels", () => {
    expect(getProductTypeLabel("digital")).toBe("Digital Product");
    expect(getProductTypeLabel("physical")).toBe("Physical Product");
    expect(getProductTypeLabel("course")).toBe("Course");
    expect(getProductTypeLabel("booking")).toBe("Booking");
  });

  it("derives labels solely from the canonical registry (no second registry)", () => {
    for (const def of PRODUCT_TYPE_REGISTRY) {
      expect(getProductTypeLabel(def.id)).toBe(def.label);
    }
  });

  it("falls back deterministically for invalid/unknown product types", () => {
    expect(getProductTypeLabel("unknown" as never)).toBe("unknown");
    expect(getProductTypeLabel("giftcard" as never)).toBe("giftcard");
  });
});

describe("RCCF-70.4.2 — Commerce mode presentation", () => {
  it("covers all three immutable modes", () => {
    expect(COMMERCE_MODES).toEqual(["ONLINE", "WHATSAPP", "BOTH"]);
  });

  it("renders distinct, behavior-neutral presentations per mode", () => {
    const online = getCommerceModePresentation("ONLINE");
    const whatsapp = getCommerceModePresentation("WHATSAPP");
    const both = getCommerceModePresentation("BOTH");

    expect(online.label).toBe("Online");
    expect(whatsapp.label).toBe("WhatsApp");
    expect(both.label).toBe("Online + WhatsApp");

    // Distinct variants so the three modes never render identically.
    const variants = new Set([online.badgeVariant, whatsapp.badgeVariant, both.badgeVariant]);
    expect(variants.size).toBe(3);

    // Presentation-only: no mode is treated as success/danger semantics.
    for (const mode of ["ONLINE", "WHATSAPP", "BOTH"] as const) {
      const p = getCommerceModePresentation(mode);
      expect(["info", "cyan", "gold"]).toContain(p.badgeVariant);
    }
  });

  it("normalizes an unknown mode to the canonical ONLINE presentation", () => {
    const fallback = getCommerceModePresentation("UNKNOWN" as never);
    expect(fallback).toEqual(getCommerceModePresentation("ONLINE"));
  });
});

describe("RCCF-70.4.2 — Product status presentation", () => {
  it("maps repository status vocabulary to semantic badge variants", () => {
    expect(getProductStatusPresentation("PUBLISHED")).toEqual({ label: "Published", badgeVariant: "success" });
    expect(getProductStatusPresentation("DRAFT")).toEqual({ label: "Draft", badgeVariant: "warning" });
    expect(getProductStatusPresentation("ARCHIVED")).toEqual({ label: "Archived", badgeVariant: "default" });
  });

  it("falls back to a neutral default for unknown statuses", () => {
    expect(getProductStatusPresentation("SOMETHING" as never)).toEqual({ label: "SOMETHING", badgeVariant: "default" });
  });
});

describe("RCCF-70.4.2 — Badge primitive stays intact", () => {
  it("still renders pill badges with token-backed variant classes", () => {
    render(<Badge variant="success">Live</Badge>);
    const badge = screen.getByText("Live");
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("bg-green-500/20");
    expect(badge.className).toContain("text-green-400");
  });

  it("renders the default variant unchanged", () => {
    render(<Badge>Label</Badge>);
    const badge = screen.getByText("Label");
    expect(badge.className).toContain("bg-zinc-800");
    expect(badge.className).toContain("text-zinc-300");
  });
});