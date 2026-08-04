import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AgencySidebar } from "@/components/admin/AgencySidebar";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

/**
 * IMPLEMENTATION-41: canonical agency console shell. Previously the AGENCY_NAV
 * sidebar only mounted under the orphan /agency/[agencyId] route — now it wraps
 * the entire /agency console. Guard is server-side (role check), the middleware
 * lifecycle guard remains the outer layer.
 */
export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "AGENCY_ADMIN" && role !== "AGENCY_STAFF") {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[var(--surface-root)] flex">
      <AgencySidebar />
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
