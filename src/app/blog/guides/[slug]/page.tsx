import type { Metadata } from "next";
import Link from "next/link";

// RCCF-IMPLEMENTATION-73 Phase 10: the guide links on /blog/guides previously
// 404'd. One [slug] route serves all guides from canonical content.
const GUIDES = [
  {
    slug: "getting-started",
    title: "Getting Started with CreatorStore",
    description: "Set up your storefront in under 10 minutes — connect your profile, add products, and go live.",
    sections: [
      { h: "1. Paste your profile", p: "Go to the homepage and paste your YouTube, Instagram, or TikTok link. CreatorStore builds a storefront from your actual content." },
      { h: "2. Make it yours", p: "Use the visual builder to customize sections, themes, and pages. Add products, services, courses or bookings." },
      { h: "3. Go live", p: "Publish to your CreatorStore subdomain or connect your own domain with free SSL. You keep 100% of every sale." },
    ],
  },
  {
    slug: "connect-social-media",
    title: "How to Connect Instagram & YouTube",
    description: "Sync your social content automatically so your storefront stays fresh.",
    sections: [
      { h: "Connect YouTube", p: "Add your YouTube channel link during setup. Your videos, stats and thumbnails can be pulled into your storefront feed." },
      { h: "Connect Instagram", p: "Link your Instagram to bring your posts and audience signals into your store. Updates flow automatically." },
      { h: "Keep it fresh", p: "Once connected, your storefront reflects your latest content — no manual uploads needed." },
    ],
  },
  {
    slug: "upi-payments",
    title: "Setting Up UPI Payments",
    description: "Accept payments from your audience instantly with UPI, cards, and net banking.",
    sections: [
      { h: "Payments on your store", p: "CreatorStore uses Razorpay so your customers can pay via UPI, cards, net banking and wallets." },
      { h: "Your money", p: "You keep 100% of every sale — CreatorStore never takes a transaction fee. Connect your payment account to receive payouts." },
      { h: "Customer experience", p: "Buyers get a smooth checkout, a receipt, and order tracking after purchase." },
    ],
  },
];

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const guide = GUIDES.find((g) => g.slug === params.slug);
  return { title: guide?.title ?? "Guide", description: guide?.description ?? "A CreatorStore guide" };
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const guide = GUIDES.find((g) => g.slug === params.slug);
  if (!guide) return null;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/blog/guides" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
          ← All guides
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{guide.title}</h1>
        <p className="mt-2 text-sm text-zinc-500">{guide.description}</p>
      </div>
      <div className="space-y-6">
        {guide.sections.map((s) => (
          <div key={s.h} className="rounded-xl border border-white/5 bg-zinc-900/50 p-5">
            <h2 className="text-base font-semibold text-white">{s.h}</h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{s.p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
