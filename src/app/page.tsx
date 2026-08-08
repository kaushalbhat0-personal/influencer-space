import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Hero } from "@/components/marketing/Hero";
import { IntegrationLogos } from "@/components/marketing/trust/IntegrationLogos";
import { ComparisonTable } from "@/components/marketing/trust/ComparisonTable";
import { BeforeAfter } from "@/components/marketing/BeforeAfter";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { AIDemo } from "@/components/marketing/AIDemo";
import { PlatformOverview } from "@/components/marketing/PlatformOverview";
import { SmartPlatform } from "@/components/marketing/SmartPlatform";
import { CreatorJourney } from "@/components/marketing/CreatorJourney";
import { BuilderShowcase } from "@/components/marketing/BuilderShowcase";
import { SellAnything } from "@/components/marketing/SellAnything";
import { Manage } from "@/components/marketing/Manage";
import { Agency } from "@/components/marketing/Agency";
import { CreatorShowcase } from "@/components/marketing/CreatorShowcase";
import { StorefrontShowcase } from "@/components/marketing/StorefrontShowcase";
import { Pricing } from "@/components/marketing/Pricing";
import { FinalCta } from "@/components/marketing/FinalCta";
import { SectionTracker } from "@/components/marketing/SectionTracker";
import { Footer } from "@/components/marketing/Footer";

import { SEED_LOGOS } from "@/lib/marketing/trust/logos";
import { SEED_COMPARISONS } from "@/lib/marketing/trust/comparison";
import { getPlatformConfig } from "@/lib/config/platform";
import { getPublicPricingData } from "@/modules/pricing/application/runtime";
import { ExperienceSection } from "@/modules/theme/runtime/experience";
import { THEME_EXPERIENCES } from "@/modules/theme/runtime/experience";
import { CONTACT_EMAIL } from "@/lib/marketing/messaging";

// RCCF-IMPLEMENTATION-71: the homepage embeds runtime pricing — render live so
// Super Admin pricing changes reflect immediately (falls back to defaults if
// the DB is unavailable).
export const dynamic = "force-dynamic";

// RCCF-IMPLEMENTATION-73 Phase 10: per-page metadata (title/description/canonical).
export const metadata: Metadata = {
  title: "CreatorStore — Turn your content into a business",
  description:
    "Paste your YouTube, Instagram, or TikTok profile and launch a storefront you fully own. Sell products, services, courses & bookings. Keep 100% of every sale. Built for Indian creators.",
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
    description: "Creator platform that builds storefronts from social profiles.",
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
  );
}

export default async function MarketingPage() {
  const comparison = SEED_COMPARISONS[0];
  const pricingData = await getPublicPricingData();

  return (
    <main id="main-content" className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />
      <SectionTracker />

      {/* Section order based on audit recommendations */}
      <Hero />

      {/* Trust: platform badges (experience-driven background) */}
      <ExperienceSection experience={MARKETING_EXPERIENCE} index={0} divider="bottom" id="trust-bar" data-testid="experience-trust-bar">
        <IntegrationLogos logos={SEED_LOGOS} />
      </ExperienceSection>

      <BeforeAfter />
      <HowItWorks />
      <AIDemo />
      <PlatformOverview />
      <SmartPlatform />
      <CreatorJourney />
      <BuilderShowcase />
      <SellAnything />
      <Manage />

      <CreatorShowcase />
      <Agency />
      <StorefrontShowcase />

      {/* Trust: comparison (config-driven) */}
      {comparison && <ComparisonTable comparison={comparison} />}

      <Pricing data={pricingData} />
      <FinalCta />
      <ExperienceSection experience={MARKETING_EXPERIENCE} index={0} divider="bottom" variant="footer">
        <Footer />
      </ExperienceSection>
      <OrganizationSchema />
    </main>
  );
}
