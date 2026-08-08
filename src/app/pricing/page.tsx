import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Pricing } from "@/components/marketing/Pricing";
import { Footer } from "@/components/marketing/Footer";
import { getPublicPricingData, getRuntimePlansByFamily } from "@/modules/pricing/application/runtime";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — CreatorStore",
  description: "Transparent pricing for creators and partners. Creator plans from ₹699/month. Partner plans from ₹2,999/month.",
  openGraph: {
    title: "Pricing — CreatorStore",
    description: "Simple, transparent pricing for creators and partners. Pay for your creator platform. Partners charge their own service fees.",
  },
};

/**
 * RCCF-IMPLEMENTATION-71: JSON-LD derives from the RUNTIME plans (BillingPlan +
 * registry fallback). Hidden/enterprise tiers are excluded. Never hardcoded.
 */
async function PricingSchemaJsonLd() {
  const [creator, partner] = await Promise.all([
    getRuntimePlansByFamily("creator"),
    getRuntimePlansByFamily("partner"),
  ]);
  const offers = [...creator, ...partner]
    .filter((p) => p.price != null && !p.hidden && !p.enterprise)
    .map((p) => ({
      "@type": "Offer",
      name: p.name,
      description: p.marketingDescription,
      price: String(p.price),
      priceCurrency: p.currency,
      category: p.family === "creator" ? "Creator subscription" : "Partner subscription",
    }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "CreatorStore",
          description: "Creator platform for independent creators and partners.",
          brand: { "@type": "Brand", name: "CreatorStore" },
          offers: {
            "@type": "AggregateOffer",
            offers,
          },
        }),
      }}
    />
  );
}

function FaqSchemaJsonLd() {
  const faqs = [
    { q: "Do partner plans include creator subscriptions?", a: "No. Every creator pays CreatorStore directly for their own Creator plan. Partner plans cover your agency business only." },
    { q: "Can a partner charge clients for services?", a: "Yes. You may charge clients separately for setup, migration, training, branding, consulting and maintenance." },
    { q: "What is the minimum plan for a creator I onboard?", a: "Partner-onboarded creators use Creator Growth (₹699/month) or higher — Creator Launch is not available for agency-managed creators." },
  ];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      }}
    />
  );
}

export default async function PricingPage() {
  const data = await getPublicPricingData();
  return (
    <main id="main-content" className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />
      <div className="pt-16">
        <Pricing data={data} />
      </div>
      <Footer />
      <PricingSchemaJsonLd />
      <FaqSchemaJsonLd />
    </main>
  );
}
