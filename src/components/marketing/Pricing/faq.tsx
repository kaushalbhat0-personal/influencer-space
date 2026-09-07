import { BRAND } from "@/lib/marketing/messaging";

const FAQ_ITEMS = [
  {
    q: "Is Launch really free?",
    a: "Launch is a 15-day free trial — no credit card required. Launch your website today and upgrade anytime. Growth and Scale are paid subscriptions: if a renewal payment fails, your subscription becomes Past Due and your public storefront stays live for 3 days (grace). Successful payment during grace restores Active instantly. After 3 days without payment it becomes Expired and your storefront returns 404 until you upgrade (e.g., Growth). You can always preview your draft via ?preview=true while signed in.",
  },
  {
    q: "How does my storefront get built?",
    a: "Paste your YouTube, Instagram, or website URL. We analyze your content, brand colors, niche, audience, and social links — then build a storefront with products, checkout, and SEO. No manual entry needed.",
  },
  {
    q: "What platforms do you support?",
    a: `YouTube, Instagram, TikTok, X (Twitter), LinkedIn, Twitch, and any website URL. If your content lives online, ${BRAND.name} can work with it.`,
  },
  {
    q: "Can I use my own domain?",
    a: `Yes — on Scale, Enterprise, and higher-tier Partner plans, with free SSL. Launch and Growth use a ${BRAND.name} subdomain for free.`,
  },
  {
    q: "How do payments work?",
    a: `${BRAND.name} uses Razorpay for payment processing. Your customers can pay via UPI, credit/debit cards, net banking, and wallets. Payouts go directly to your linked account.`,
  },
  {
    q: "What can I sell?",
    a: "Digital products, physical merchandise, services and bookings, and affiliate links — with UPI and card checkout via Razorpay. Courses can be showcased on your storefront.",
  },
  {
    q: `Can agencies use ${BRAND.name}?`,
    a: `Yes. Partner plans support multi-client workspaces, white-label branding on higher tiers, team collaboration, and agency revenue insights. Generate storefronts for clients in minutes.`,
  },
  {
    q: "Can I switch plans later?",
    a: "Upgrade or downgrade anytime. Your data, products, and settings stay exactly as they are. Paid upgrades via Razorpay activate after the webhook confirms payment — your old plan stays active until the new subscription is Active.",
  },
  {
    q: "What happens if my payment fails?",
    a: "Your subscription moves to Past Due. Your public storefront stays live for 3 days (grace) — retry payment in Billing to restore Active instantly. If unpaid after 3 days it becomes Expired and your storefront returns 404 until you upgrade (e.g., Upgrade to Growth). Existing data is preserved and preview remains available while you fix billing.",
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
        <h2 className="text-center text-lg font-semibold text-white mb-8">Frequently asked questions</h2>
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
