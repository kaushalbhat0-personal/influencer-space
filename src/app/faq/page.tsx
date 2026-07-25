import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PricingFAQ } from "@/components/marketing/PricingFAQ";
import { Footer } from "@/components/marketing/Footer";


export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about CreatorStore — AI storefront generation, pricing, payments, agency features, and more.",
  openGraph: {
    title: "FAQ — CreatorStore",
    description: "Everything you need to know about CreatorStore. AI generation, pricing, payments, custom domains, and agency features.",
  },
};

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />
      <div className="pt-16">
        <PricingFAQ />
      </div>
      <Footer />
    </main>
  );
}
