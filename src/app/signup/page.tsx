import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup/SignupForm";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export const metadata: Metadata = {
  title: "Sign Up Free — CreatorStore",
  description: "Create your free CreatorStore account and build your creator website in minutes.",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[var(--surface-root)]"><LoadingSpinner size="lg" text="Loading..." /></div>}>
      <SignupForm />
    </Suspense>
  );
}
