export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Terms and Conditions
        </h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: July 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using CreatorStore (&quot;Platform&quot;), operated by Influencer
              Space (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;), you agree to be bound by these Terms and
              Conditions. If you do not agree, you may not use the Platform. These Terms
              are displayed at checkout and are available at all times at this URL.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">2. Services</h2>
            <p>
              CreatorStore provides digital creator storefronts, allowing creators to sell
              merchandise, digital products, and accept payments through integrated
              payment gateways including Razorpay. We reserve the right to modify or
              discontinue any service at any time with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">3. User Accounts</h2>
            <p>
              Creators are responsible for maintaining the confidentiality of their
              account credentials. You agree to notify us immediately of any
              unauthorized use of your account. You must be at least 18 years old to
              register as a seller or 13 years old to make a purchase with parental
              consent.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">4. Prohibited Items &amp; Activities</h2>
            <p>
              The following items and activities are strictly prohibited on CreatorStore:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Illegal goods or services, counterfeit products, and stolen goods.</li>
              <li>Weapons, ammunition, explosives, or hazardous materials.</li>
              <li>Drugs, narcotics, psychotropic substances, or drug paraphernalia.</li>
              <li>Tobacco, alcohol, or related products (where prohibited by law).</li>
              <li>Gambling, betting, lottery tickets, or real-money gaming services.</li>
              <li>Adult content, pornography, or sexually explicit materials.</li>
              <li>Financial services requiring regulatory approval (loans, insurance).</li>
              <li>Misleading, fraudulent, or deceptive listings.</li>
            </ul>
            <p className="mt-2">
              We reserve the right to remove listings and suspend accounts that violate
              this policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">5. Payments &amp; Fees</h2>
            <p>
              All payments processed through the Platform are handled by Razorpay, our
              third-party payment processor. Influencer Space does not store or process
              credit/debit card details directly. By making a purchase, you agree to
              Razorpay&apos;s terms of service.
            </p>
            <p className="mt-2">
              Platform fees are as follows: the Starter plan is free (10% transaction
              fee per sale), and the Pro plan is ₹999 per month (5% transaction fee per
              sale). All fees are exclusive of applicable taxes. Creators are
              responsible for any income tax or GST obligations arising from their
              sales.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">6. Subscriptions &amp; Billing</h2>
            <p>
              Pro plan subscriptions are billed monthly in advance at ₹999/month.
              Subscriptions automatically renew unless cancelled at least 24 hours before
              the end of the current billing period. Cancellations take effect at the end
              of the current billing cycle. No partial refunds are provided for unused
              portions of a billing period.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">7. Dispute Resolution</h2>
            <p>
              Disputes between buyers and creators are handled in accordance with our
              Cancellation &amp; Refund Policy. If a dispute cannot be resolved between the
              parties, Influencer Space may mediate. By using the Platform, you agree
              that Influencer Space&apos;s decision in such disputes is final and binding.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">8. Limitation of Liability</h2>
            <p>
              CreatorStore is provided &quot;as is&quot; without warranties of any kind, express
              or implied. We shall not be liable for any indirect, incidental, or
              consequential damages arising from your use of the Platform. Our total
              liability shall not exceed the total fees paid by you in the 12 months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">9. Termination</h2>
            <p>
              We may suspend or terminate your account at any time for violation of
              these Terms, illegal activity, or conduct that harms the Platform or
              other users. You may terminate your account at any time by contacting
              support. Upon termination, you must cease all use of the Platform.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">10. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws
              of India. Any disputes shall be subject to the exclusive jurisdiction of
              courts in Pune, Maharashtra.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">11. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:support@influencerspace.in" className="text-s8ul-cyan hover:underline">
                support@influencerspace.in
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
