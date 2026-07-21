import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export const dynamic = "force-dynamic";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-root)]">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    }>
      {children}
    </Suspense>
  );
}
