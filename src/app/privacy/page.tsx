export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: July 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">1. Information We Collect</h2>
            <p>We collect the following categories of data to operate the CreatorStore platform and process payments:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Account data:</strong> name, email address, phone number, and password when you register as a creator or buyer.</li>
              <li><strong>Profile data:</strong> bio, social media links, profile image, and storefront content (products, images, videos) that you choose to upload.</li>
              <li><strong>Payment data:</strong> billing address and payment instrument details. These are collected and stored by Razorpay, our payment processor — we do not store full card numbers or UPI IDs on our servers.</li>
              <li><strong>Technical data:</strong> IP address, browser type, device information, and usage patterns collected automatically when you visit the Platform.</li>
              <li><strong>Communication data:</strong> messages and inquiries you send through our contact forms.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">2. Why We Collect &amp; How We Use Your Data</h2>
            <p>We use your data for the following purposes:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Account management:</strong> to create and maintain your account, authenticate your login, and communicate platform updates.</li>
              <li><strong>Payment processing:</strong> to facilitate transactions via Razorpay, including order confirmations, invoices, and refunds.</li>
              <li><strong>Storefront operation:</strong> to display your products, social feeds, and gallery content to visitors.</li>
              <li><strong>Platform improvement:</strong> to analyse usage patterns, fix bugs, and improve the user experience.</li>
              <li><strong>Customer support:</strong> to respond to your inquiries and resolve disputes.</li>
            </ul>
            <p className="mt-2">We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">3. Payment Information &amp; Third-Party Processors</h2>
            <p>
              All payment transactions on CreatorStore are processed by Razorpay, a
              RBI-regulated payment aggregator. When you make a purchase, your payment
              details (card number, UPI ID, etc.) are transmitted directly to Razorpay
              over an encrypted connection. We do not store complete payment instrument
              data on our servers. Please refer to{" "}
              <a href="https://razorpay.com/privacy/" className="text-s8ul-cyan hover:underline">
                Razorpay&apos;s Privacy Policy
              </a>{" "}
              for details on how they handle your payment data.
            </p>
            <p className="mt-2">
              We may also share anonymised or aggregated data with analytics providers
              (e.g., Vercel Analytics) to understand platform usage. Hosting is provided
              by Vercel Inc., which processes data in accordance with its own privacy
              commitments.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">4. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. If you
              delete your account, we delete or anonymise your personal data within 30
              days, except where we are required by law to retain it (e.g., transaction
              records for tax purposes, which are retained for 8 years as required by
              Indian law). Payment transaction records are retained by Razorpay per their
              own retention policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">5. Data Security</h2>
            <p>
              We implement industry-standard security measures including SSL/TLS
              encryption (HTTPS), database encryption at rest, and access controls to
              protect your data during transmission and storage. However, no method of
              electronic storage or transmission is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">6. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We may
              also use analytics cookies to understand how our Platform is used. You can
              control cookie preferences through your browser settings. Disabling
              essential cookies may affect Platform functionality.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">7. Your Rights</h2>
            <p>
              Under the Digital Personal Data Protection Act, 2023 (DPDPA), you have the
              right to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Access your personal data held by us.</li>
              <li>Correct inaccuracies in your personal data.</li>
              <li>Request deletion of your personal data.</li>
              <li>Withdraw consent for processing where consent is the basis.</li>
              <li>Grieve any violation of your data protection rights.</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at{" "}
              <a href="mailto:privacy@influencerspace.in" className="text-s8ul-cyan hover:underline">
                privacy@influencerspace.in
              </a>
              . We will respond within 30 days as required by law.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">8. Grievance Officer</h2>
            <p>
              In compliance with the Information Technology Act, 2000 and the DPDPA,
              2023, the Grievance Officer for CreatorStore is:
            </p>
            <p className="mt-1">
              <strong>Grievance Officer</strong><br />
              Influencer Space<br />
              Pune, Maharashtra 411001, India<br />
              Email:{" "}
              <a href="mailto:grievance@influencerspace.in" className="text-s8ul-cyan hover:underline">
                grievance@influencerspace.in
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
