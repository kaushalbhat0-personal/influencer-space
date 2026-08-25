import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Blog",
  // RCCF-MKT-10 P3-A: index metadata addresses the broad platform audience
  // (creators, freelancers, businesses) — the previous "Indian creators"
  // framing narrowed the platform on an entry positioning surface.
  description:
    "Tips, guides, and strategies for creators, freelancers, and businesses building their presence and business online.",
  openGraph: {
    title: "CreatorStore Blog",
    description:
      "Learn how to build your presence online — showcase your work, sell products and services, and grow your business.",
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
      <Footer />
    </div>
  );
}
