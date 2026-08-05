import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Pricing } from "@/components/marketing/Pricing";
import { Footer } from "@/components/marketing/Footer";
import { getCreatorCommercePlans, getPartnerCommercePlans } from "@/config/commerce/plans";

export const metadata: Metadata = {
  title: "Pricing — CreatorStore",
  description: "Transparent pricing for creators and partners. Creator plans from ₹699/month. Partner plans from ₹1,499/month.",
  openGraph: {
    title: "Pricing — CreatorStore",
    description: "Simple, transparent pricing for creators and partners. Pay for your creator platform. Partners charge their own service fees.",
  },
};

/**
 * IMPLEMENTATION-42 Phase 15: honest, config-derived JSON-LD (Pricing + FAQ
 * schema). Prices derive from the canonical commerce config — never hardcoded.
 */
function PricingSchemaJsonLd() {
  const offers = [...getCreatorCommercePlans(), ...getPartnerCommercePlans()]
    .filter((p) => p.price != null && !p.manual)
    .map((p) => ({
      "@type": "Offer",
      name: p.name,
      description: p.description,
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
    { q: "What is the minimum plan for a creator I onboard?", a: "Partner-onboarded creators use Creator Grow (₹699/month) or higher — Creator Launch is not available for agency-managed creators." },
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

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />
      <div className="pt-16">
        <Pricing />
      </div>
      <Footer />
      <PricingSchemaJsonLd />
      <FaqSchemaJsonLd />
    </main>
  );
}
