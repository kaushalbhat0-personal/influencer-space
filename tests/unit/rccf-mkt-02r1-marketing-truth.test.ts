/**
 * RCCF-MKT-02-R1 — marketing truth guardrails.
 *
 * Source-level assertions (correct token present / wrong token absent) pinning:
 *   1. No mojibake in any marketing surface
 *   2. No unsupported claims (scale, stats, fabricated social proof)
 *   3. Pricing copy derives from the runtime — no stale hardcoded figures,
 *      no duplicated brand in the pricing title
 *   4. Blog no longer contradicts the Razorpay payment architecture
 *   5. Screenshot references stay limited to the two known canonical assets
 *      (replacement deferred to the user-supplied captures)
 *   6. Every internal nav/footer link resolves to an existing route
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function walk(dirRel: string): string[] {
  const out: string[] = [];
  const abs = join(ROOT, dirRel);
  for (const entry of readdirSync(abs)) {
    const p = join(dirRel, entry);
    if (statSync(join(ROOT, p)).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".tsx") || p.endsWith(".ts")) out.push(p);
  }
  return out;
}

describe("RCCF-MKT-02-R1 — mojibake elimination", () => {
  it("no double-encoded UTF-8 sequences remain in marketing surfaces", () => {
    const files = [
      ...walk("src/components/marketing"),
      ...walk("src/lib/marketing"),
      "src/app/page.tsx",
      "src/app/layout.tsx",
      "src/app/features/page.tsx",
      "src/app/about/page.tsx",
      "src/app/pricing/page.tsx",
      "src/app/faq/page.tsx",
      "src/app/blog/[slug]/page.tsx",
      "src/app/blog/guides/[slug]/page.tsx",
    ];
    for (const f of files) {
      const text = read(f);
      expect(text.includes("\u00E2\u20AC"), `mojibake (â€) found in ${f}`).toBe(false);
      // Common Latin-1 misread artifacts for smart quotes/dashes.
      expect(/\u00C2[\u0080-\u00BF]/.test(text), `Ã-mojibake found in ${f}`).toBe(false);
    }
  });
});

describe("RCCF-MKT-02-R1 — unsupported claims removed", () => {
  it("'thousands of creators' claim is gone from marketing data and pages", () => {
    const files = [...walk("src/lib/marketing"), "src/app/about/page.tsx"];
    for (const f of files) {
      expect(read(f).toLowerCase()).not.toContain("thousands of creators");
    }
  });

  it("fabricated testimonial and social-proof exports are deleted", async () => {
    const content = await import("@/lib/marketing/content");
    expect("TESTIMONIALS" in content).toBe(false);
    const messaging = await import("@/lib/marketing/messaging");
    expect("SOCIAL_PROOF_STATS" in messaging).toBe(false);
  });

  it("no invented scale statistics anywhere in marketing data", () => {
    for (const f of walk("src/lib/marketing")) {
      const text = read(f);
      expect(text).not.toContain("10,000+");
      expect(text).not.toContain("5,000+");
    }
  });
});

describe("RCCF-MKT-02-R1 — pricing truth", () => {
  const page = read("src/app/pricing/page.tsx");

  it("title does not duplicate the brand (template appends it)", () => {
    // Page-level metadata title is exactly "Pricing" — the root template
    // ("%s — CreatorStore") appends the brand exactly once. (The openGraph
    // title legitimately uses the full brand form: OG titles are absolute
    // and never pass through the template.)
    expect(page).toMatch(/return \{\s*\n\s*title: "Pricing",/);
  });

  it("creator 'from' price derives from runtime plans, not a hardcoded figure", () => {
    expect(page).toContain("export async function generateMetadata");
    expect(page).toContain("getPublicPricingData()");
    // MODERNIZED in RCCF-MKT-05: both family "from" prices derive via the
    // paidFromPrice helper (the old inline Math.min(...paidPrices) was folded
    // into it when the partner figure stopped being hardcoded too).
    expect(page).toContain("paidFromPrice(data.creator)");
    expect(page).toContain("Creator plans from Free");
    // The stale token that contradicted runtime pricing must never return,
    // and no static creator ₹ figure may be reintroduced.
    expect(page).not.toContain("paid plans from ₹999");
    expect(page).not.toMatch(/paid plans from ₹\d/);
  });

  // MODERNIZED in RCCF-MKT-05: the partner "from" price is DERIVED from the
  // runtime plans (Super Admin pricing edits can never leave stale metadata).
  it("partner pricing line derives from runtime, not a hardcoded figure", () => {
    expect(page).toContain("paidFromPrice(data.partner)");
    expect(page).not.toContain("₹4,999");
    expect(page).not.toMatch(/Partner plans from ₹\d/);
  });

  it("FAQ schema no longer hardcodes a Growth price figure", () => {
    expect(page).not.toContain("(₹999/month)");
    expect(page).toContain("use Creator Growth or higher");
  });

  it("FAQ dataset answer carries no plan price figures", () => {
    const faq = read("src/lib/marketing/content.ts");
    expect(faq).not.toContain("₹999");
    expect(faq).not.toContain("₹1,995");
    expect(faq).toContain("See the pricing page for current plan rates.");
  });
});

describe("RCCF-MKT-02-R1 — blog payment architecture truth", () => {
  const post = read("src/app/blog/[slug]/page.tsx");

  it("UPI post no longer claims 'No third-party payment gateways'", () => {
    expect(post.toLowerCase()).not.toContain("no third-party payment gateways");
  });

  it("UPI post names Razorpay as the processor (matches platform reality)", () => {
    expect(post).toContain("Razorpay");
  });

  it("unsupported '90%' statistic is gone", () => {
    expect(post).not.toContain("90%");
  });

  it("no bank-settlement timing promise remains", () => {
    expect(post.toLowerCase()).not.toContain("appears in your account within seconds");
  });
});

describe("RCCF-MKT-02-R1 — homepage positioning & IA", () => {
  const home = read("src/app/page.tsx");
  const hero = read("src/components/marketing/Hero.tsx");

  it("hero carries the core positioning headline", () => {
    expect(hero).toContain("Your presence.");
    expect(hero).toContain("Your ");
    expect(hero).toContain("business");
  });

  it("homepage title is absolute so the template cannot duplicate the brand", () => {
    expect(home).toContain('title: { absolute:');
  });

  it("new narrative sections are composed; repetitive grids are retired", () => {
    for (const needed of ["CoreIdea", "HowItWorks", "CreatorShowcase", "SellAnything", "PromoteBand", "BuilderShowcase", "GrowBand", "StorefrontShowcase", "Pricing", "FinalCta"]) {
      expect(home).toContain(needed);
    }
    for (const retired of ["BeforeAfter", "AIDemo", "PlatformOverview", "SmartPlatform", "CreatorJourney", "Manage", "Agency", "ComparisonTable"]) {
      expect(home).not.toContain(`components/marketing/${retired}`);
    }
  });

  it("final CTA closes on the positioning without fake urgency or counts", () => {
    const cta = read("src/components/marketing/FinalCta.tsx");
    expect(cta).toContain("Your presence. Your business.");
    expect(cta).not.toMatch(/limited time|hurry|only today|creators joined|signups? this/i);
  });
});

describe("RCCF-MKT-02-R1 — screenshot safety (modernized by RCCF-MKT-03: certified assets are wired)", () => {
  it("storefront screenshot references stay limited to the canonical pair in exactly two rendered surfaces", () => {
    const layout = read("src/app/layout.tsx");
    const hero = read("src/components/marketing/Hero.tsx");
    // OG/Twitter (layout) + hero preview keep the canonical reference.
    expect(layout.match(/marketing-assets\/storefront\/01-desktop\.png/g)?.length).toBe(2);
    expect(hero).toContain("/marketing-assets/storefront/01-desktop.png");
    // RCCF-MKT-03: StorefrontShowcase now renders the certified pair; no
    // OTHER component may render a storefront capture.
    const imgRef = /<img[^>]+marketing-assets\/storefront/;
    for (const f of walk("src/components/marketing").filter(
      (p) => !p.endsWith("Hero.tsx") && !p.endsWith("StorefrontShowcase.tsx"),
    )) {
      expect(imgRef.test(read(f)), `unexpected rendered capture in ${f}`).toBe(false);
    }
  });

  it("proof section presents exactly the certified desktop+mobile demonstration pair", () => {
    const proof = read("src/components/marketing/StorefrontShowcase.tsx");
    // Guardrail modernized (RCCF-MKT-04-R1): desktop capture may be wired via
    // <picture><source srcSet> (breakpoint-aware) or a direct src.
    expect(proof).toMatch(/srcSet="\/marketing-assets\/storefront\/01-desktop\.png"|src="\/marketing-assets\/storefront\/01-desktop\.png"/);
    expect(proof).toContain('src="/marketing-assets/storefront/02-mobile.png"');
    // Demonstration framing only — never endorsement/testimonial language.
    expect(proof.toLowerCase()).not.toMatch(/endorse|testimonial|customer success|official/);
  });

  it("no new/fabricated marketing asset filenames were introduced", () => {
    const all = [
      read("src/app/layout.tsx"),
      read("src/components/marketing/Hero.tsx"),
      ...walk("src/components/marketing").map(read),
    ].join("\n");
    const refs = all.match(/marketing-assets\/[a-z0-9\-./]+/g) ?? [];
    for (const r of refs) {
      expect(
        /marketing-assets\/storefront\/0[12]-(desktop|mobile)\.png/.test(r),
        `non-canonical asset reference: ${r}`,
      ).toBe(true);
    }
  });
});

describe("RCCF-MKT-02-R1 — navigation links resolve to real routes", () => {
  function hrefsFrom(source: string): string[] {
    return [...source.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
  }

  it("every MarketingNav link maps to an existing page route", () => {
    const nav = read("src/components/marketing/MarketingNav.tsx");
    for (const href of hrefsFrom(nav)) {
      const p = href.split("?")[0].replace(/^\//, "");
      expect(statSync(join(ROOT, "src/app", p, "page.tsx")).isFile(), `missing route for ${href}`).toBe(true);
    }
  });

  it("every Footer link maps to an existing page route", () => {
    const footer = read("src/components/marketing/Footer.tsx");
    for (const href of hrefsFrom(footer)) {
      const p = href.split("?")[0].replace(/^\//, "");
      expect(statSync(join(ROOT, "src/app", p, "page.tsx")).isFile(), `missing route for ${href}`).toBe(true);
    }
  });
});
