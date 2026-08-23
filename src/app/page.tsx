import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Hero } from "@/components/marketing/Hero";
import { IntegrationLogos } from "@/components/marketing/trust/IntegrationLogos";
import { CoreIdea } from "@/components/marketing/CoreIdea";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { CreatorShowcase } from "@/components/marketing/CreatorShowcase";
import { SellAnything } from "@/components/marketing/SellAnything";
import { PromoteBand } from "@/components/marketing/PromoteBand";
import { BuilderShowcase } from "@/components/marketing/BuilderShowcase";
import { GrowBand } from "@/components/marketing/GrowBand";
import { StorefrontShowcase } from "@/components/marketing/StorefrontShowcase";
import { Pricing } from "@/components/marketing/Pricing";
import { FinalCta } from "@/components/marketing/FinalCta";
import { SectionTracker } from "@/components/marketing/SectionTracker";
import { Footer } from "@/components/marketing/Footer";

import { SEED_LOGOS } from "@/lib/marketing/trust/logos";
import { getPlatformConfig } from "@/lib/config/platform";
import { getPublicPricingData } from "@/modules/pricing/application/runtime";
import { ExperienceSection, THEME_EXPERIENCES } from "@/modules/theme/runtime/experience";
import { CONTACT_EMAIL } from "@/lib/marketing/messaging";

// RCCF-IMPLEMENTATION-71: the homepage embeds runtime pricing — render live so
// Super Admin pricing changes reflect immediately (falls back to defaults if
// the DB is unavailable).
export const dynamic = "force-dynamic";

/**
 * RCCF-MKT-02-R1: absolute title prevents the root template from appending a
 * second "— CreatorStore" to the homepage title.
 */
export const metadata: Metadata = {
  title: { absolute: "CreatorStore — Your presence. Your business." },
  description:
    "CreatorStore is a professional home online — your website, showcase, links, and storefront in one place you own. Build it in minutes and keep 100% of every sale.",
  alternates: { canonical: "/" },
};

/** IMPLEMENTATION-45: config-driven marketing experience (aurora + classic rhythm). */
const MARKETING_EXPERIENCE = THEME_EXPERIENCES.aurora;

/** IMPLEMENTATION-43 Phase 11: honest Organization schema (no fabricated claims). */
function OrganizationSchema() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CreatorStore",
    url: getPlatformConfig().appUrl,
    email: CONTACT_EMAIL,
    description:
      "Platform for building a professional home online — website, showcase, links, and commerce in one place you own.",
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
  );
}

/**
 * RCCF-MKT-02-R1 — repositioned homepage IA (~9 narrative sections):
 *
 *   Hero ("Your presence. Your business.")
 *     → Trust strip (platforms + payments)
 *     → Core idea (one home for everything)
 *     → How it works (single timeline)
 *     → Showcase · Sell · Promote · Build · Grow
 *     → Product experience (typography; screenshots deferred)
 *     → Pricing → Final CTA
 *
 * Retired from this page (components retained in the codebase): BeforeAfter,
 * AIDemo, PlatformOverview, SmartPlatform, CreatorJourney, Manage, Agency,
 * ComparisonTable, and the old screenshot-led StorefrontShowcase presentation.
 */
export default async function MarketingPage() {
  const pricingData = await getPublicPricingData();

  return (
    <main id="main-content" className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />
      <SectionTracker />

      <Hero />

      {/* Trust: platform badges (experience-driven background) */}
      <ExperienceSection experience={MARKETING_EXPERIENCE} index={0} divider="bottom" id="trust-bar" data-testid="experience-trust-bar">
        <IntegrationLogos logos={SEED_LOGOS} />
      </ExperienceSection>

      <CoreIdea />
      <HowItWorks />
      <CreatorShowcase />
      <SellAnything />
      <PromoteBand />
      <BuilderShowcase />
      <GrowBand />
      <StorefrontShowcase />

      <Pricing data={pricingData} />
      <FinalCta />
      <ExperienceSection experience={MARKETING_EXPERIENCE} index={0} divider="bottom" variant="footer">
        <Footer />
      </ExperienceSection>
      <OrganizationSchema />
    </main>
  );
}
