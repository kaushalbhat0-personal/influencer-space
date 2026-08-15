import {
  Store,
  ShoppingBag,
  BarChart3,
  Search,
  Palette,
  Webhook,
  Users,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: Store,
    title: "Profile-Built Storefront",
    body: "Your storefront is generated from your actual content — colors, style, and layout that match your brand.",
  },
  {
    icon: ShoppingBag,
    title: "Products & Commerce",
    body: "Sell digital downloads and physical merch, take service bookings, and earn affiliate commissions. UPI + card checkout.",
  },
  {
    icon: BarChart3,
    title: "Order Analytics",
    body: "Track sales, revenue, and customer orders from a clear dashboard. Know what works and what doesn't.",
  },
  {
    icon: Search,
    title: "SEO Optimized",
    body: "Every storefront is built with SEO best practices — meta tags, structured data, sitemaps, and fast loading.",
  },
  {
    icon: Palette,
    title: "Visual Builder",
    body: "Drag-and-drop editor with real-time preview. Customize every section without touching code.",
  },
  {
    icon: Webhook,
    title: "Custom Domain",
    body: "Use your own domain with free SSL. Professional branding, no subdomain required on paid plans.",
  },
  {
    icon: Users,
    title: "Creator Dashboard",
    body: "Manage orders, products, customers, and content from a single, powerful dashboard.",
  },
  {
    icon: Zap,
    title: "Publish in One Click",
    body: "Compose your storefront from your profile and publish to your domain with a single click.",
  },
];

export function PlatformOverview() {
  return (
    <section id="platform" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            A complete{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              creator business
            </span>{" "}
            platform
          </h2>
          <p className="mt-3 text-zinc-500 max-w-2xl mx-auto">
            Not just a storefront. You get the entire infrastructure to run your
            creator business — products, payments, analytics, SEO, and a visual
            builder.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-6 transition-all hover:border-white/[0.12] hover:bg-[var(--surface-base)]/80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 transition-colors group-hover:bg-indigo-500/20">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
