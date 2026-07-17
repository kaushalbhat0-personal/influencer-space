import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

const posts = {
  "how-to-monetize-your-audience": {
    title: "How to Monetize Your Audience as an Indian Creator in 2026",
    date: "2026-07-10",
    content: `
      <p>Monetizing your audience in India has never been more accessible. With UPI payments, regional language content, and a rapidly growing digital economy, creators have more tools than ever to turn their passion into profit.</p>
      <h2>1. Digital Products (Zero Inventory)</h2>
      <p>Sell PDF guides, presets, templates, or courses. No shipping, no returns, instant delivery. Platforms like CreatorStore let you upload once and sell forever.</p>
      <h2>2. Physical Merch</h2>
      <p>T-shirts, hoodies, mugs — your fans want to rep your brand. With print-on-demand, you never hold inventory. Designer uploads the artwork, creator promotes, and every sale generates profit.</p>
      <h2>3. Affiliate Marketing</h2>
      <p>Promote tools you already use. Every time a fan buys through your link, you earn a commission. Track everything from a single dashboard.</p>
      <h2>4. Memberships & Exclusive Content</h2>
      <p>Give your biggest fans access to exclusive content, early videos, or a private community. Recurring revenue is the holy grail for creators.</p>
    `,
  },
  "instagram-vs-youtube-which-is-better-for-selling": {
    title: "Instagram vs YouTube: Which Platform is Better for Selling?",
    date: "2026-07-05",
    content: `
      <p>Every creator asks this question. The answer depends on your content style, audience, and what you're selling.</p>
      <h2>Instagram — High Impressions, Low Friction</h2>
      <p>Instagram's swipe-up links, story stickers, and shoppable posts make it easy to drive traffic. Best for lifestyle, fashion, and beauty creators. The downside? Algorithm dependency.</p>
      <h2>YouTube — Deep Trust, Higher Conversion</h2>
      <p>YouTube videos build deeper trust. A 10-minute tutorial or review creates more buying intent than a 15-second reel. Best for tech, education, and gaming creators.</p>
      <h2>The Winner? Both.</h2>
      <p>Use Instagram for top-of-funnel awareness and YouTube for in-depth trust-building. Link both to your CreatorStore and let your storefront do the rest.</p>
    `,
  },
  "upi-integration-for-creators": {
    title: "UPI Integration for Creators: Accept Payments Instantly",
    date: "2026-06-28",
    content: `
      <p>UPI (Unified Payments Interface) is India's digital payment revolution. For creators, it means instant payments with zero transaction fees for small amounts.</p>
      <h2>Why UPI Matters for Creators</h2>
      <p>90% of Indian digital transactions happen via UPI. If your storefront doesn't support UPI, you're leaving money on the table. Credit cards work, but UPI is what your audience actually uses.</p>
      <h2>Setting Up UPI Payments</h2>
      <p>With CreatorStore, UPI is built-in. Connect your UPI ID once and every sale goes directly to your bank account. No third-party payment gateways, no monthly fees.</p>
      <h2>Instant Settlements</h2>
      <p>Unlike credit cards which take 3-5 days for settlement, UPI payments are instant. The money appears in your account within seconds of a sale.</p>
    `,
  },
};

export function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = posts[params.slug as keyof typeof posts];
  if (!post) return {};
  return {
    title: post.title,
    description: post.content.replace(/<[^>]*>/g, "").slice(0, 160),
    openGraph: {
      title: post.title,
      description: post.content.replace(/<[^>]*>/g, "").slice(0, 160),
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = posts[params.slug as keyof typeof posts];
  if (!post) notFound();

  return (
    <article className="space-y-8">
      <div>
        <Link
          href="/blog"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← Back to Blog
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{post.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-xs text-zinc-600">
          <time dateTime={post.date}>{post.date}</time>
        </div>
      </div>
      <div
        className="prose prose-invert max-w-none space-y-4 text-sm leading-relaxed text-zinc-400 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_p]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
