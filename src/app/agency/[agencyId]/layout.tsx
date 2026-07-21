import { Sidebar } from "@/components/layout/Sidebar";
import { AGENCY_NAV } from "@/lib/navigation/config";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface-root)] flex">
      <Sidebar nav={AGENCY_NAV} />
      <div className="flex-1 min-w-0">
        <main className="p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" text="Loading..." /></div>}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
