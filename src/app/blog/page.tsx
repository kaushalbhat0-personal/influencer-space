import Link from "next/link";
import type { Metadata } from "next";

// RCCF-MKT-11: page-level metadata replaces the layout's openGraph object, so
// the index declares its own canonical here (the layout cannot carry one —
// /blog/guides would inherit the wrong URL).
export const metadata: Metadata = {
  alternates: { canonical: "/blog" },
};

const posts = [
  {
    slug: "how-to-monetize-your-audience",
    title: "How to Monetize Your Audience as an Indian Creator in 2026",
    excerpt:
      "From merch to memberships — the complete playbook for turning followers into a sustainable income stream.",
    date: "2026-07-10",
    readTime: "8 min read",
  },
  {
    slug: "instagram-vs-youtube-which-is-better-for-selling",
    title: "Instagram vs YouTube: Which Platform is Better for Selling?",
    excerpt:
      "We break down conversion rates, audience intent, and the hidden costs of each platform for creators.",
    date: "2026-07-05",
    readTime: "6 min read",
  },
  {
    slug: "upi-integration-for-creators",
    title: "UPI Integration for Creators: Accept Payments Instantly",
    excerpt:
      "Why UPI is the payment method your Indian audience wants and how to set it up in minutes without a business bank account.",
    date: "2026-06-28",
    readTime: "5 min read",
  },
];

export default function BlogPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CreatorStore Blog</h1>
        {/* RCCF-MKT-10 P3-A: the blog index is a positioning surface — it
            speaks to the full platform audience, not a single segment.
            Individual articles stay topic-specific on purpose. */}
        <p className="mt-2 text-sm text-zinc-500">
          Tips, guides, and strategies for creators, freelancers, and
          businesses building their presence online.
        </p>
      </div>

      <div className="space-y-8">
        {posts.map((post) => (
          <article key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="group block space-y-2">
              <h2 className="text-lg font-semibold text-white transition-colors group-hover:text-s8ul-cyan">
                {post.title}
              </h2>
              <p className="text-sm leading-relaxed text-zinc-500">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-3 text-xs text-zinc-600">
                <time dateTime={post.date}>{post.date}</time>
                <span>&middot;</span>
                <span>{post.readTime}</span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
