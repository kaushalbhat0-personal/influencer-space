export default function RefundPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-gaming text-3xl font-bold text-white sm:text-4xl">
          Cancellation &amp; Refund Policy
        </h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: July 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">1. Order Cancellation</h2>
            <p>
              You may cancel an order within 2 hours of placing it, provided the order
              has not yet been processed or shipped. To cancel, please contact the
              individual creator from whom you purchased, or reach out to{" "}
              <a href="mailto:support@influencerspace.in" className="text-s8ul-cyan hover:underline">
                support@influencerspace.in
              </a>{" "}
              with your order ID.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">2. Refunds</h2>
            <p>
              Refunds are processed on a case-by-case basis by the individual creator
              whose product was purchased. Refunds are generally available under the
              following conditions:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>The product received is damaged or defective.</li>
              <li>The product received is significantly different from its description.</li>
              <li>The order was not delivered within the promised timeframe.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">3. Digital Products</h2>
            <p>
              Due to the nature of digital products (downloads, digital assets,
              memberships), refunds for digital purchases are generally not available
              once the product has been accessed or downloaded.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">4. Refund Timeline</h2>
            <p>
              Approved refunds are processed within 7-10 business days. The refund
              amount will be credited to the original payment method. Processing times
              may vary depending on your bank or payment provider.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">5. Disputes</h2>
            <p>
              If a refund request is declined by the creator, you may escalate the
              matter to Influencer Space at{" "}
              <a href="mailto:support@influencerspace.in" className="text-s8ul-cyan hover:underline">
                support@influencerspace.in
              </a>{" "}
              for mediation. We aim to resolve disputes within 14 business days.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
