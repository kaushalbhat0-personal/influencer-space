import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tips, guides, and strategies for Indian creators to monetize their audience and build a sustainable online business.",
  openGraph: {
    title: "CreatorStore Blog — Tips for Indian Creators",
    description:
      "Learn how to sell merch, grow your brand, and earn more with your content.",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
        <Link href="/" className="text-sm font-semibold text-zinc-400 transition-colors hover:text-white">
          ← CreatorStore
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-500">
          <Link href="/blog" className="hover:text-zinc-300">Blog</Link>
          <Link href="/blog/guides" className="hover:text-zinc-300">Guides</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
