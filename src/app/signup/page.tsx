import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup/SignupForm";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getRuntimePlansByFamily } from "@/modules/pricing/application/runtime";

// RCCF-MKT-03: title must not carry the brand — the root template appends
// "— CreatorStore", so a branded title here rendered "…CreatorStore — CreatorStore".
export const metadata: Metadata = {
  title: "Sign Up Free",
  description: "Create your free CreatorStore account and build your creator website in minutes.",
};

// RCCF-36: signup pricing consumes the canonical runtime (DB-authoritative)
// source, so Pricing Center == Marketing == Signup for new purchases.
export default async function SignupPage() {
  const [creator, partner] = await Promise.all([
    getRuntimePlansByFamily("creator"),
    getRuntimePlansByFamily("partner"),
  ]);
  const pricing: Record<string, { price: number | null; annualPrice: number | null }> = {};
  for (const p of [...creator, ...partner]) {
    pricing[p.code] = { price: p.price, annualPrice: p.annualPrice };
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[var(--surface-root)]"><LoadingSpinner size="lg" text="Loading..." /></div>}>
      <SignupForm pricing={pricing} />
    </Suspense>
  );
}
