import Link from "next/link";

export function FinalCta() {
  return (
    <section id="final-cta" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-zinc-900/50 to-transparent px-6 py-14 backdrop-blur-sm sm:px-12 sm:py-20">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Your creator business starts today.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-zinc-400">
            Generate your storefront in minutes. No credit card required.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/signup" className="btn-primary px-10 py-3.5 text-sm">
              Generate My Storefront — Free
            </Link>
            <a href="#ai-demo" className="btn-secondary px-10 py-3.5 text-sm">
              See AI Demo
            </a>
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            No credit card required · 2-minute setup · AI-generated storefront · Custom domain · Analytics &amp; SEO
          </p>
        </div>
      </div>
    </section>
  );
}
