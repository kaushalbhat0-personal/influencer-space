export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-gaming text-3xl font-bold text-white sm:text-4xl">
          Terms and Conditions
        </h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: July 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Influencer Space platform (&quot;Platform&quot;),
              you agree to be bound by these Terms and Conditions. If you do not agree,
              you may not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">2. Services</h2>
            <p>
              Influencer Space provides digital creator storefronts, allowing creators
              to sell merchandise, digital products, and accept payments through
              integrated payment gateways. We reserve the right to modify or discontinue
              any service at any time.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">3. User Accounts</h2>
            <p>
              Creators are responsible for maintaining the confidentiality of their
              account credentials. You agree to notify us immediately of any
              unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">4. Payments</h2>
            <p>
              All payments processed through the Platform are handled by third-party
              payment processors including Razorpay. Influencer Space does not store
              or process credit card details directly. By making a purchase, you agree
              to the payment processor&apos;s terms of service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">5. Limitation of Liability</h2>
            <p>
              Influencer Space is provided &quot;as is&quot; without warranties of any kind.
              We shall not be liable for any indirect, incidental, or consequential
              damages arising from your use of the Platform.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">6. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the
              laws of India. Any disputes shall be subject to the exclusive
              jurisdiction of courts in Hyderabad, Telangana.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">7. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:support@influencerspace.in" className="text-s8ul-cyan hover:underline">
                support@influencerspace.in
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
