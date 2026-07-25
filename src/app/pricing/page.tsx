import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Pricing } from "@/components/marketing/Pricing";
import { Footer } from "@/components/marketing/Footer";
import { BRAND } from "@/lib/marketing/messaging";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Start free. Upgrade when you grow. Simple pricing for creators and agencies. ${BRAND.shortDescription}`,
  openGraph: {
    title: "Pricing — CreatorStore",
    description: "Start free. Upgrade when you grow. Simple, transparent pricing for creators and agencies.",
  },
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />
      <div className="pt-16">
        <Pricing />
      </div>
      <Footer />
    </main>
  );
}
