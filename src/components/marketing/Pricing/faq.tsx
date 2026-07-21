const FAQ_ITEMS = [
  { q: "Is Free Forever really free?", a: "Yes. No credit card required. No time limit. You can build and publish your storefront completely free." },
  { q: "Can I upgrade later?", a: "Absolutely. Upgrade anytime from your dashboard. Your data, products, and settings stay exactly as they are." },
  { q: "Can I change plans anytime?", a: "Yes. Upgrade or downgrade whenever you need. Changes take effect immediately." },
  { q: "Do agencies manage multiple creators?", a: "Yes. Agency plans include a multi-tenant dashboard. Switch between creator workspaces without logging out." },
  { q: "Do you charge transaction fees?", a: "CreatorStore does not charge per-transaction fees on paid plans. Your revenue is yours." },
  { q: "Can I use my own domain?", a: "Yes. Creator Pro, Elite, and all Agency plans include custom domain support with free SSL." },
];

export function PricingFAQ() {
  return (
    <section className="px-4 py-16 sm:px-8 sm:py-24">
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
