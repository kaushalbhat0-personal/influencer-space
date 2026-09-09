import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Footer } from "@/components/marketing/Footer";
import { BRAND, CONTACT_EMAIL } from "@/lib/marketing/messaging";
import { FAQ_CATEGORIES } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: `Help — ${BRAND.name}`,
  description: `Get help with ${BRAND.name}: getting started, builder, integrations, YouTube/Instagram, payments, domains, publishing, and agency client management.`,
  alternates: { canonical: "/help" },
  openGraph: {
    title: `Help — ${BRAND.name}`,
    description: `Help center for ${BRAND.name}: guides, FAQ, builder quick links, and agency workflow.`,
  },
};

const BUILDER_LINKS = [
  { label: "Appearance", href: "/admin/appearance", desc: "Themes, colors, layout, and typography" },
  { label: "SEO", href: "/admin/seo", desc: "Title, description, and search visibility" },
  { label: "Domain", href: "/admin/settings/domain", desc: "Pendallo subdomain or your own domain (Scale+ for custom domain)" },
  { label: "Integrations", href: "/admin/integrations", desc: "Resend email and other connected services" },
  { label: "Publish", href: "/builder", desc: "Open Builder → Save Draft then Publish to go live" },
] as const;

const AGENCY_STEPS = [
  "Give Pendallo information about the client — website, Google Business profile, social link, business description, or resume.",
  "We intelligently analyze the profile and build the website (blueprint → composition → builder).",
  "We set up workspace, website, and publishing for you.",
  "Client website is linked to your agency.",
  "A secure invitation is sent — the client sets their own password.",
  "The client becomes the owner; you remain the manager.",
] as const;

export default function HelpPage() {
  return (
    <main id="main-content" className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />
      <div className="pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Help Center</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Everything you need to launch and manage your {BRAND.name} website — guides, answers, and quick links. No guesswork.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              New here? Start with{" "}
              <Link href="/blog/guides/getting-started" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                Getting Started
              </Link>{" "}
              — under 10 minutes from profile to live site.
            </p>
          </div>

          {/* Pilot feedback — prominent lightweight invitation */}
          <section aria-labelledby="pilot-feedback-heading" className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 sm:p-5">
            <h2 id="pilot-feedback-heading" className="text-sm font-semibold text-amber-200">Found a bug or something difficult?</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">
              Tell us what happened at{" "}
              <a href={`mailto:${CONTACT_EMAIL}?subject=Pilot%20feedback%20—%20${BRAND.name}`} className="font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200">
                {CONTACT_EMAIL}
              </a>
              . We&apos;re actively improving {BRAND.name} during the pilot and would love to hear what you run into — bugs, errors, or anything confusing.
            </p>
          </section>

          {/* Quick nav anchor */}
          <nav aria-label="Help sections" className="mt-8 flex flex-wrap justify-center gap-2 text-xs">
            <a href="#getting-started" className="rounded-full border border-white/10 px-3 py-1.5 text-zinc-400 hover:border-white/20 hover:text-zinc-200">Getting Started</a>
            <a href="#builder" className="rounded-full border border-white/10 px-3 py-1.5 text-zinc-400 hover:border-white/20 hover:text-zinc-200">Builder &amp; Publish</a>
            <a href="#social" className="rounded-full border border-white/10 px-3 py-1.5 text-zinc-400 hover:border-white/20 hover:text-zinc-200">YouTube &amp; Instagram</a>
            <a href="#agency" className="rounded-full border border-white/10 px-3 py-1.5 text-zinc-400 hover:border-white/20 hover:text-zinc-200">For Agencies</a>
            <a href="#faq" className="rounded-full border border-white/10 px-3 py-1.5 text-zinc-400 hover:border-white/20 hover:text-zinc-200">FAQ</a>
            <a href="#contact" className="rounded-full border border-white/10 px-3 py-1.5 text-zinc-400 hover:border-white/20 hover:text-zinc-200">Contact</a>
          </nav>

          {/* Getting Started */}
          <section id="getting-started" className="mt-12 scroll-mt-24">
            <h2 className="text-xl font-semibold text-white">Getting Started</h2>
            <p className="mt-1 text-sm text-zinc-400">From profile to live site — the exact steps.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
                <p className="text-sm font-semibold text-white">1. Paste your profile</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">Go to the homepage and paste your YouTube, Instagram, TikTok, or any website link. {BRAND.name} builds a storefront from your actual content.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
                <p className="text-sm font-semibold text-white">2. Make it yours</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">Use the visual builder to customize sections, themes, and pages. Add products, services, courses, or bookings.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
                <p className="text-sm font-semibold text-white">3. Go live</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">Publish to your {BRAND.name} subdomain or connect your own domain with free SSL (custom domain on Scale+). You keep 100% of every sale.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/blog/guides/getting-started" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400">Read Getting Started guide</Link>
              <Link href="/signup?persona=creator" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-white/20 hover:text-white">Create your website</Link>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Already have an account? Go to <Link href="/admin/dashboard" className="text-indigo-400 hover:text-indigo-300">Dashboard</Link> → <Link href="/builder" className="text-indigo-400 hover:text-indigo-300">Builder</Link>.</p>
          </section>

          {/* Builder Quick Links */}
          <section id="builder" className="mt-12 scroll-mt-24">
            <h2 className="text-xl font-semibold text-white">Builder — recommended path</h2>
            <p className="mt-1 text-sm text-zinc-400">Complete in order. Each step is a real route or action in the app.</p>
            <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Recommended completion path</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">Edit content → Appearance → Integrations → SEO → Domain → Publish</p>
              <p className="mt-1 text-xs text-zinc-500">Edit in the Builder canvas, then tune each area before publishing. Changes stay as Draft until you Publish.</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BUILDER_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block rounded-xl border border-white/5 bg-zinc-900/50 p-4 transition-colors hover:border-white/10"
                >
                  <p className="text-sm font-semibold text-white">{l.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">{l.desc}</p>
                </Link>
              ))}
              <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
                <p className="text-sm font-semibold text-white">Edit content</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">Open <Link href="/builder" className="text-indigo-400 hover:text-indigo-300">Builder</Link> → Sections to add products, gallery, timeline, links, and pages. Real-time preview on all devices.</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Tip: In the Builder, use <span className="text-zinc-300">Save Draft</span> to save without publishing, then <span className="text-emerald-400">Publish</span> to make changes live. <Link href="/help#builder" className="text-indigo-400">View Live</Link> opens your published subdomain instantly.</p>
          </section>

          {/* YouTube / Instagram Integration Guide */}
          <section id="social" className="mt-12 scroll-mt-24">
            <h2 className="text-xl font-semibold text-white">YouTube &amp; Instagram</h2>
            <p className="mt-1 text-sm text-zinc-400">Connect once, keep your storefront fresh.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
                <h3 className="text-sm font-semibold text-white">Connect YouTube</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">Add your YouTube channel link during setup. Your videos, stats, and thumbnails can be pulled into your storefront feed.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
                <h3 className="text-sm font-semibold text-white">Connect Instagram</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">Link your Instagram to bring posts and audience signals into your store. Once connected, updates are handled for you.</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs leading-relaxed text-amber-300">
                Live/automatic social sync is available on Creator Scale+ and higher. On Launch and Growth, your storefront still builds from your profile, but live sync requires an upgrade. Manage connections in <Link href="/admin/integrations" className="underline underline-offset-2">Integrations</Link> or from <Link href="/admin/settings" className="underline underline-offset-2">Settings</Link>.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/blog/guides/connect-social-media" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-white/20 hover:text-white">Full social integration guide</Link>
              <Link href="/admin/integrations" className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">Go to Integrations</Link>
            </div>
          </section>

          {/* Payments */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-white">Payments &amp; Orders</h2>
            <p className="mt-1 text-sm text-zinc-400">{BRAND.name} uses Razorpay — UPI, cards, net banking, and wallets. You keep 100% of every sale.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/blog/guides/upi-payments" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-white/20 hover:text-white">UPI payments guide</Link>
              <Link href="/admin/billing" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-white/20 hover:text-white">Billing</Link>
            </div>
          </section>

          {/* Agency */}
          <section id="agency" className="mt-12 scroll-mt-24">
            <h2 className="text-xl font-semibold text-white">For agencies &amp; freelancers</h2>
            <p className="mt-1 text-sm text-zinc-400">Generate and manage client websites at scale.</p>
            <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
              <h3 className="text-sm font-semibold text-white">New Client Website — How it works</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-zinc-400">
                {AGENCY_STEPS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-zinc-500">No passwords are generated or shared by the agency. Resend is optional — without it, share the invitation link manually.</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/agency/generate" className="block rounded-xl border border-white/5 bg-zinc-900/50 p-4 hover:border-white/10">
                <p className="text-sm font-semibold text-white">Create a client website</p>
                <p className="mt-1 text-xs text-zinc-400">Website, Google Business, social link, business description, or resume — and a Creator plan.</p>
              </Link>
              <Link href="/agency" className="block rounded-xl border border-white/5 bg-zinc-900/50 p-4 hover:border-white/10">
                <p className="text-sm font-semibold text-white">Agency Workspace</p>
                <p className="mt-1 text-xs text-zinc-400">Health, publishing, billing, and commission in one place.</p>
              </Link>
              <Link href="/agency/integrations" className="block rounded-xl border border-white/5 bg-zinc-900/50 p-4 hover:border-white/10">
                <p className="text-sm font-semibold text-white">Agency Integrations</p>
                <p className="mt-1 text-xs text-zinc-400">Connect your own Resend (Scale+ behavior on the client path is the same).</p>
              </Link>
              <Link href="/pricing" className="block rounded-xl border border-white/5 bg-zinc-900/50 p-4 hover:border-white/10">
                <p className="text-sm font-semibold text-white">Pricing &amp; client policy</p>
                <p className="mt-1 text-xs text-zinc-400">Every client pays {BRAND.name} directly (Grow minimum for agency-managed).</p>
              </Link>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="mt-12 scroll-mt-24">
            <h2 className="text-xl font-semibold text-white">Frequently asked questions</h2>
            <p className="mt-1 text-sm text-zinc-400">Answers from the FAQ — same source as <Link href="/faq" className="text-indigo-400 hover:text-indigo-300">/faq</Link> and Pricing.</p>
            <div className="mt-4 space-y-6">
              {FAQ_CATEGORIES.map((cat) => (
                <div key={cat.id}>
                  <h3 className="text-sm font-semibold text-white">{cat.label}</h3>
                  <div className="mt-2 space-y-2">
                    {cat.items.map((item) => (
                      <details key={item.q} className="group rounded-lg border border-white/5 bg-zinc-900/30 p-4 open:bg-zinc-900/50">
                        <summary className="cursor-pointer list-none text-sm font-medium text-zinc-200 group-open:text-white">{item.q}</summary>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.a}</p>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              More on <Link href="/faq" className="text-indigo-400 hover:text-indigo-300">FAQ</Link> · <Link href="/blog/guides" className="text-indigo-400 hover:text-indigo-300">All guides</Link> · <Link href="/pricing" className="text-indigo-400 hover:text-indigo-300">Pricing</Link>
            </p>
          </section>

          {/* Contact */}
          <section id="contact" className="mt-12 scroll-mt-24">
            <h2 className="text-xl font-semibold text-white">Contact &amp; support</h2>
            <p className="mt-1 text-sm text-zinc-400">We read every message and reply as soon as we can.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
                <p className="text-sm font-semibold text-white">Email</p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1 inline-block text-sm text-indigo-400 hover:text-indigo-300">{CONTACT_EMAIL}</a>
                <p className="mt-3 text-xs text-zinc-500">Influencer Space · Pune, Maharashtra, India</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
                <p className="text-sm font-semibold text-white">Quick links</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li><Link href="/contact" className="text-indigo-400 hover:text-indigo-300">Contact form</Link></li>
                  <li><Link href="/terms" className="text-zinc-400 hover:text-zinc-300">Terms</Link> · <Link href="/privacy" className="text-zinc-400 hover:text-zinc-300">Privacy</Link> · <Link href="/refund" className="text-zinc-400 hover:text-zinc-300">Refunds</Link></li>
                  <li><Link href="/features" className="text-zinc-400 hover:text-zinc-300">Features</Link> · <Link href="/about" className="text-zinc-400 hover:text-zinc-300">About</Link></li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
