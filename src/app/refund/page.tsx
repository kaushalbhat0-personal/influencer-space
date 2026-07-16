export default function RefundPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Cancellation &amp; Refund Policy
        </h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: July 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">1. Platform Subscription Cancellation</h2>
            <p>
              Creators on the Pro plan (₹999/month) may cancel their subscription at
              any time. Cancellations take effect at the end of the current billing
              cycle. You will continue to have access to Pro features until the end of
              the paid period. No partial refunds are provided for the remaining days
              of a billing period after cancellation.
            </p>
            <p className="mt-2">
              To cancel, go to your Billing settings or contact us at{" "}
              <a href="mailto:support@influencerspace.in" className="text-s8ul-cyan hover:underline">
                support@influencerspace.in
              </a>.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">2. Buyer Order Cancellation</h2>
            <p>
              If you have placed an order as a buyer, you may request cancellation
              within 2 hours of placing the order, provided the order has not yet been
              processed or shipped by the creator. To request cancellation, contact the
              creator directly or reach out to us at{" "}
              <a href="mailto:support@influencerspace.in" className="text-s8ul-cyan hover:underline">
                support@influencerspace.in
              </a>{" "}
              with your order ID.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">3. Refunds for Physical Products</h2>
            <p>
              Refunds for physical merchandise are handled by the individual creator
              from whom the product was purchased. Refund requests are generally
              accepted under the following conditions:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>The product received is damaged or defective.</li>
              <li>The product received is significantly different from its description.</li>
              <li>The order was not delivered within the promised timeframe.</li>
            </ul>
            <p className="mt-2">
              Return shipping costs are borne by the buyer unless the return is due to
              a creator error.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">4. Digital Products</h2>
            <p>
              Due to the nature of digital products (downloadable files, digital assets,
              online course access, presets), refunds for digital purchases are generally
              not available once the product has been accessed or downloaded. Creators
              may choose to offer refunds at their discretion.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">5. Refund Timeline &amp; Processing</h2>
            <p>
              Approved refunds are processed within 7-10 business days from the date of
              approval. The refund amount will be credited to the original payment
              method (UPI ID, card, or net banking account) via Razorpay. Processing
              times may vary depending on your bank or payment provider.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">6. Dispute Mediation</h2>
            <p>
              If a refund request is declined or unresolved by the creator, you may
              escalate the matter to Influencer Space at{" "}
              <a href="mailto:support@influencerspace.in" className="text-s8ul-cyan hover:underline">
                support@influencerspace.in
              </a>{" "}
              for mediation. We review disputes within 14 business days and our decision
              is final. For payment-specific disputes, Razorpay&apos;s own dispute resolution
              mechanism may also be available.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
