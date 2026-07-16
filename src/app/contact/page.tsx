import Link from "next/link";
import { ContactFormClient } from "./_components/contact-form-client";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black/90 to-s8ul-purple/30" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-16 md:py-24">
        <div className="mb-12 text-center">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
            Contact Us
          </h1>
          <p className="mt-3 text-zinc-400">
            Have a question about the platform, billing, or your storefront? We&apos;re here to help.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* ─── Contact Info ─── */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-semibold text-white">Platform Support</h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-s8ul-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="font-medium text-white">Email</p>
                    <a href="mailto:support@influencerspace.in" className="text-s8ul-cyan transition-colors hover:text-s8ul-cyan/80">
                      support@influencerspace.in
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-s8ul-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <p className="font-medium text-white">WhatsApp</p>
                    <p className="text-zinc-400">+91-98765-43210</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-s8ul-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-white">Address</p>
                    <p className="text-zinc-400">
                      CreatorStore India Pvt. Ltd.<br />
                      Pune, Maharashtra 411001<br />
                      India
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h2 className="mb-3 text-lg font-semibold text-white">Quick Links</h2>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="text-s8ul-cyan transition-colors hover:text-s8ul-cyan/80">Terms and Conditions</Link></li>
                <li><Link href="/privacy" className="text-s8ul-cyan transition-colors hover:text-s8ul-cyan/80">Privacy Policy</Link></li>
                <li><Link href="/refund" className="text-s8ul-cyan transition-colors hover:text-s8ul-cyan/80">Cancellation & Refund Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* ─── Contact Form ─── */}
          <div>
            <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h2 className="mb-1 text-lg font-semibold text-white">Send Us a Message</h2>
              <p className="mb-5 text-sm text-zinc-500">
                Fill out the form below and we&apos;ll get back to you within 24 hours.
              </p>
              <ContactFormClient />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
