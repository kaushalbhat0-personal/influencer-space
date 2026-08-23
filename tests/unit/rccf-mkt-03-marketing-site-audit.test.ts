/**
 * RCCF-MKT-03 — full marketing site audit guardrails.
 *
 * Pins the contracts established by the page-by-page audit:
 *   Truth       — no unsupported payout claims, no unverifiable SLA promises,
 *                 legal entity naming consistent with the legal pages, no
 *                 user-facing mojibake in the audited surfaces.
 *   Positioning — /features groups capabilities into Build · Showcase · Sell ·
 *                 Promote · Grow and keeps partner-only capabilities separate;
 *                 CTAs do not collapse CreatorStore into an AI-storefront tool.
 *   Metadata    — route titles never carry the brand (the root template appends
 *                 it), so no "CreatorStore — CreatorStore" duplication.
 *   Asset safety— the certified SPower Gaming captures keep their canonical
 *                 paths and demonstration-only framing.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("RCCF-MKT-03 - truth", () => {
  it("no 'Instant payouts' claim remains anywhere in marketing messaging", () => {
    const messaging = read("src/lib/marketing/messaging.ts");
    const features = read("src/app/features/page.tsx");
    for (const text of [messaging, features]) {
      expect(text.includes("Instant payouts")).toBe(false);
    }
    expect(messaging).toContain("Payouts to your linked account");
  });

  it("contact page promises no response-time SLA (none is implemented)", () => {
    const page = read("src/app/contact/page.tsx");
    const form = read("src/app/contact/_components/contact-form-client.tsx");
    for (const text of [page, form]) {
      expect(text.toLowerCase()).not.toContain("one business day");
      expect(text.toLowerCase()).not.toContain("24 hours");
    }
    expect(page).toContain("as soon as we can");
  });

  it("contact entity matches the legal pages (Influencer Space)", () => {
    const contact = read("src/app/contact/page.tsx");
    const terms = read("src/app/terms/page.tsx");
    expect(contact).toContain("Influencer Space");
    expect(contact.includes("CreatorStore India Pvt. Ltd.")).toBe(false);
    expect(terms).toContain("Influencer Space");
  });

  it("no double-encoded UTF-8 sequences remain in the audited surfaces", () => {
    const files = [
      "src/app/signup/page.tsx",
      "src/app/purchase/page.tsx",
      "src/app/contact/page.tsx",
      "src/app/contact/_components/contact-form-client.tsx",
      "src/app/onboarding/page.tsx",
      "src/app/features/page.tsx",
      "src/lib/marketing/messaging.ts",
    ];
    for (const f of files) {
      const text = read(f);
      expect(
        text.includes("\u00E2\u20AC"),
        `mojibake found in ${f}`,
      ).toBe(false);
    }
  });
});

describe("RCCF-MKT-03 - positioning", () => {
  it("/features groups capabilities into the five conceptual pillars", () => {
    const messaging = read("src/lib/marketing/messaging.ts");
    for (const pillar of ["Build", "Showcase", "Sell", "Promote", "Grow"]) {
      expect(messaging).toContain(`category: "${pillar}"`);
    }
    const features = read("src/app/features/page.tsx");
    expect(features).toContain("AGENCY_CAPABILITIES");
  });

  it("/features keeps partner capabilities out of the creator pillar list", () => {
    const messaging = read("src/lib/marketing/messaging.ts");
    expect(messaging).toContain('export const AGENCY_CAPABILITIES');
    expect(messaging).toContain("White-label branding on higher tiers");
    const growItems = messaging.slice(
      messaging.indexOf('category: "Grow"'),
      messaging.indexOf("AGENCY_CAPABILITIES"),
    );
    expect(growItems.includes("Multi-client workspaces")).toBe(false);
  });

  it("/features final CTA does not collapse the platform into AI storefront generation", () => {
    const features = read("src/app/features/page.tsx");
    expect(features).not.toContain("Generate My Storefront");
    expect(features).toContain("Ready to build your home online?");
  });
});

describe("RCCF-MKT-03 - metadata (no duplicated brand)", () => {
  it("signup title carries no brand — the root template appends it", () => {
    const signup = read("src/app/signup/page.tsx");
    expect(signup).toContain('title: "Sign Up Free"');
    expect(signup.includes("Sign Up Free — CreatorStore")).toBe(false);
  });

  it("purchase title carries no brand", () => {
    const purchase = read("src/app/purchase/page.tsx");
    expect(purchase).toContain('title: "Track Your Order"');
    expect(purchase.includes("Track Your Order — CreatorStore")).toBe(false);
  });

  it("root template still appends the brand exactly once", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain('template: "%s — CreatorStore"');
  });
});

describe("RCCF-MKT-03 - certified asset safety", () => {
  it("StorefrontShowcase wires exactly the two certified captures, demonstration-framed", () => {
    const showcase = read("src/components/marketing/StorefrontShowcase.tsx");
    // Guardrail modernized (RCCF-MKT-04-R1): the desktop capture is wired via
    // <picture><source srcSet> for breakpoint-aware selection; the phone
    // capture remains the default src.
    expect(showcase).toMatch(/srcSet="\/marketing-assets\/storefront\/01-desktop\.png"|src="\/marketing-assets\/storefront\/01-desktop\.png"/);
    expect(showcase).toContain('src="/marketing-assets/storefront/02-mobile.png"');
    expect(showcase).toContain("Example of a website built with CreatorStore");
    expect(showcase.toLowerCase()).not.toContain("deferred");
    expect(showcase).not.toContain("known-invalid");
  });

  it("hero keeps the certified desktop capture with no stale deferral notes", () => {
    const hero = read("src/components/marketing/Hero.tsx");
    // Guardrail modernized (RCCF-MKT-04-R1): desktop capture via <source srcSet>.
    expect(hero).toMatch(/srcSet="\/marketing-assets\/storefront\/01-desktop\.png"|src="\/marketing-assets\/storefront\/01-desktop\.png"/);
    expect(hero.toLowerCase()).not.toContain("deferred");
    expect(hero).not.toContain("known-invalid");
  });

  it("no other storefront screenshot paths are referenced by marketing surfaces", () => {
    const files = [
      "src/app/page.tsx",
      "src/app/layout.tsx",
      "src/components/marketing/Hero.tsx",
      "src/components/marketing/StorefrontShowcase.tsx",
    ];
    for (const f of files) {
      const text = read(f);
      const refs = text.match(/marketing-assets\/storefront\/[\w.\-]+/g) ?? [];
      for (const ref of refs) {
        expect(
          ["01-desktop.png", "02-mobile.png"].some((p) => ref === `marketing-assets/storefront/${p}`),
          `uncertified asset reference ${ref} in ${f}`,
        ).toBe(true);
      }
    }
  });
});
