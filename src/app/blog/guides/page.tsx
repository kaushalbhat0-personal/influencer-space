import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Step-by-step guides for Indian creators to set up their storefront, connect social media, and start selling.",
};

const guides = [
  {
    title: "Getting Started with CreatorStore",
    description:
      "Set up your storefront in under 10 minutes. Connect your social accounts, add products, and go live.",
    href: "/blog/guides/getting-started",
  },
  {
    title: "How to Connect Instagram & YouTube",
    description:
      "Sync your social content automatically. Your feed stays fresh without manual uploads.",
    href: "/blog/guides/connect-social-media",
  },
  {
    title: "Setting Up UPI Payments",
    description:
      "Accept payments from your audience instantly. No business bank account required.",
    href: "/blog/guides/upi-payments",
  },
];

export default function GuidesPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/blog" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
          ← Blog
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Guides</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Step-by-step guides to help you succeed.
        </p>
      </div>

      <div className="space-y-6">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="block space-y-2 rounded-xl border border-white/5 bg-zinc-900/50 p-5 transition-colors hover:border-white/10"
          >
            <h2 className="text-base font-semibold text-white">{guide.title}</h2>
            <p className="text-sm text-zinc-500">{guide.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
