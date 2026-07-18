import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/marketing/signup-form";

export const metadata: Metadata = {
  title: "Sign Up Free — CreatorStore",
  description:
    "Get your 1 free website builder today. Create your agency and start building stores for creators in under 2 minutes.",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-950 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm lg:grid-cols-2">
        {/* Left — Marketing Copy */}
        <div className="hidden flex-col justify-center bg-gradient-to-br from-s8ul-cyan/5 to-purple-500/5 px-10 py-14 lg:flex">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">
            ← Back to home
          </Link>
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-white">
            Get your free website builder today.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Build stores for creators, manage them from one dashboard, and earn
            automated revenue share. No credit card required.
          </p>
          <div className="mt-8 space-y-4">
            {[
              "1 free website builder included",
              "Multi-tenant dashboard",
              "Automated Razorpay revenue splitting",
              "Upgrade anytime for more seats",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-s8ul-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-zinc-300">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form */}
        <div className="flex flex-col justify-center px-6 py-14 sm:px-10">
          <div className="mb-6 lg:hidden">
            <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">
              ← Back to home
            </Link>
            <h1 className="mt-4 text-xl font-bold text-white">
              Get your free website builder today.
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              No credit card required.
            </p>
          </div>

          <SignupForm />

          <p className="mt-4 text-center text-xs text-zinc-600">
            Already have an account?{" "}
            <Link href="/admin/login" className="text-s8ul-cyan hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
