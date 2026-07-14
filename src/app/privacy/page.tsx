export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-gaming text-3xl font-bold text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: July 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">1. Information We Collect</h2>
            <p>
              We collect information you provide directly, including your name, email
              address, and payment information when you create an account or make a
              purchase. We also collect technical data such as IP addresses, browser
              type, and usage patterns.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">2. How We Use Information</h2>
            <p>
              Your information is used to provide and improve our services, process
              transactions, send order confirmations, and communicate product updates.
              We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">3. Payment Information</h2>
            <p>
              Payment transactions are processed by Razorpay, our third-party payment
              processor. Payment card details are collected and stored by Razorpay,
              not by Influencer Space. Please refer to{" "}
              <a href="https://razorpay.com/privacy/" className="text-s8ul-cyan hover:underline">
                Razorpay&apos;s Privacy Policy
              </a>{" "}
              for details.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">4. Data Security</h2>
            <p>
              We implement industry-standard security measures including SSL
              encryption to protect your data during transmission. However, no method
              of electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">5. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We
              may also use analytics cookies to understand how our Platform is used.
              You can disable cookies in your browser settings.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">6. Your Rights</h2>
            <p>
              You have the right to access, update, or delete your personal
              information. To exercise these rights, contact us at{" "}
              <a href="mailto:privacy@influencerspace.in" className="text-s8ul-cyan hover:underline">
                privacy@influencerspace.in
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
