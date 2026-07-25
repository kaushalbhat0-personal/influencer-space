const FAQ_ITEMS = [
  {
    q: "How does the AI build my storefront?",
    a: "Paste your YouTube, Instagram, or creator profile URL. Our AI analyzes your content, brand colors, niche, audience, and social links — then generates a complete storefront with products, checkout, and SEO. No manual entry needed.",
  },
  {
    q: "What platforms do you support?",
    a: "YouTube, Instagram, TikTok, X (Twitter), LinkedIn, Twitch, and any website URL. If your content lives online, CreatorStore can work with it.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Creator Pro, Elite, and all Agency plans include custom domain support with free SSL. You can also use a CreatorStore subdomain for free.",
  },
  {
    q: "How do payments work?",
    a: "CreatorStore uses Razorpay for payment processing. Your customers can pay via UPI, credit/debit cards, net banking, and wallets. Payouts go directly to your linked account.",
  },
  {
    q: "What can I sell?",
    a: "Digital products, courses, memberships, coaching, physical merchandise, event tickets, donations, and affiliate links. If you can create it, you can sell it.",
  },
  {
    q: "Can agencies use CreatorStore?",
    a: "Yes. Agency plans support multi-client workspaces, white-label branding, team collaboration, and centralized analytics. Generate storefronts for clients in minutes.",
  },
  {
    q: "Can I switch plans later?",
    a: "Upgrade or downgrade anytime. Your data, products, and settings stay exactly as they are. Changes take effect immediately.",
  },
  {
    q: "Who owns my content and data?",
    a: "You do. Your content, products, customer data, and storefront are yours. You can export your data and cancel anytime. We never claim ownership of your content.",
  },
];

export function PricingFAQ() {
  return (
    <section id="faq" className="px-4 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <h3 className="text-center text-lg font-semibold text-white mb-8">Frequently asked questions</h3>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30">
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 list-none text-sm font-medium text-zinc-300">
                {item.q}
                <svg className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="px-5 pb-4 text-sm text-zinc-500 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
