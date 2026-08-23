import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PricingFAQ } from "@/components/marketing/PricingFAQ";
import { Footer } from "@/components/marketing/Footer";

// RCCF-IMPLEMENTATION-73 Phase 10: FAQPage structured data (the /faq page
// previously had no JSON-LD).
const FAQ_SCHEMA = [
  { q: "What is CreatorStore?", a: "CreatorStore turns your content into a business you own. Paste your YouTube, Instagram, or TikTok profile and launch a storefront with products, checkout and SEO — and keep 100% of every sale." },
  { q: "Is there a free trial?", a: "Yes. Creator Launch is a 15-day free trial — no credit card required. Your site stays live after the trial; editing and publishing follow your plan." },
  { q: "What does it cost to sell?", a: "Creators keep 100% of every sale. CreatorStore never takes a transaction fee — you pay for your plan, and everything your customers spend goes to you." },
  { q: "How do payments work?", a: "CreatorStore uses Razorpay. Your customers can pay via UPI, cards, net banking and wallets, and money lands in your account." },
  { q: "Can agencies use CreatorStore?", a: "Yes. Partner plans support client management, white-label branding and recurring subscription revenue sharing." },
];

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about CreatorStore — storefront generation, pricing, payments, agency features, and more.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ — CreatorStore",
    description: "Everything you need to know about CreatorStore. Storefront generation, pricing, payments, custom domains, and agency features.",
  },
};

export default function FAQPage() {
  return (
    <main id="main-content" className="min-h-screen bg-zinc-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_SCHEMA.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <MarketingNav />
      <div className="pt-16">
        <PricingFAQ />
      </div>
      <Footer />
    </main>
  );
}
