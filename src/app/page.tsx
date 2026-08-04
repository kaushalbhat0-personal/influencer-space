import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Hero } from "@/components/marketing/Hero";
import { Section } from "@/components/marketing/Section";
import { IntegrationLogos } from "@/components/marketing/trust/IntegrationLogos";
import { MetricGrid } from "@/components/marketing/trust/MetricGrid";
import { TestimonialCarousel } from "@/components/marketing/trust/TestimonialCarousel";
import { CaseStudyGrid } from "@/components/marketing/trust/CaseStudyGrid";
import { ComparisonTable } from "@/components/marketing/trust/ComparisonTable";
import { BeforeAfter } from "@/components/marketing/BeforeAfter";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { AIDemo } from "@/components/marketing/AIDemo";
import { PlatformOverview } from "@/components/marketing/PlatformOverview";
import { BuilderShowcase } from "@/components/marketing/BuilderShowcase";
import { SellAnything } from "@/components/marketing/SellAnything";
import { Manage } from "@/components/marketing/Manage";
import { Agency } from "@/components/marketing/Agency";
import { CreatorShowcase } from "@/components/marketing/CreatorShowcase";
import { Pricing } from "@/components/marketing/Pricing";
import { PricingFAQ } from "@/components/marketing/PricingFAQ";
import { FinalCta } from "@/components/marketing/FinalCta";
import { SectionTracker } from "@/components/marketing/SectionTracker";
import { Footer } from "@/components/marketing/Footer";

import { SEED_LOGOS } from "@/lib/marketing/trust/logos";
import { SEED_METRICS } from "@/lib/marketing/trust/metrics";
import { SEED_TESTIMONIALS } from "@/lib/marketing/trust/testimonials";
import { SEED_CASE_STUDIES } from "@/lib/marketing/trust/case-studies";
import { SEED_COMPARISONS } from "@/lib/marketing/trust/comparison";
import { getPlatformConfig } from "@/lib/config/platform";
import { ExperienceSection } from "@/modules/theme/runtime/experience";
import { THEME_EXPERIENCES } from "@/modules/theme/runtime/experience";

/** IMPLEMENTATION-45: config-driven marketing experience (aurora + classic rhythm). */
const MARKETING_EXPERIENCE = THEME_EXPERIENCES.aurora;

/** IMPLEMENTATION-43 Phase 11: honest Organization schema (no fabricated claims). */
function OrganizationSchema() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CreatorStore",
    url: getPlatformConfig().appUrl,
    description: "Creator platform that builds storefronts from social profiles.",
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
  );
}

export default async function MarketingPage() {
  const comparison = SEED_COMPARISONS[0];

  return (
    <main id="main-content" className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />
      <SectionTracker />

      {/* Section order based on audit recommendations */}
      <Hero />

      {/* Trust: platform badges + metrics (experience-driven background) */}
      <ExperienceSection experience={MARKETING_EXPERIENCE} index={0} divider="bottom" id="trust-bar" data-testid="experience-trust-bar">
        <IntegrationLogos logos={SEED_LOGOS} />
        <MetricGrid metrics={SEED_METRICS} />
      </ExperienceSection>

      <BeforeAfter />
      <HowItWorks />
      <AIDemo />
      <PlatformOverview />
      <BuilderShowcase />
      <SellAnything />
      <Manage />

      {/* Creator Showcase + Testimonials */}
      <CreatorShowcase />

      {/* Trust: real creator testimonials */}
      <TestimonialCarousel
        testimonials={SEED_TESTIMONIALS}
        title="Trusted by creators like you"
        subtitle="Real stories from creators who turned their content into a business with CreatorStore."
      />

      {/* Trust: case studies */}
      <Section id="case-studies" tone="neutral">
        <CaseStudyGrid caseStudies={SEED_CASE_STUDIES} />
      </Section>
      <Agency />

      {/* Trust: comparison (config-driven) */}
      {comparison && <ComparisonTable comparison={comparison} />}

      <Pricing />
      <PricingFAQ />
      <FinalCta />
      <Footer />
      <OrganizationSchema />
    </main>
  );
}
