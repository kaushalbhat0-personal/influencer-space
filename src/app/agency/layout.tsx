import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AgencySidebar } from "@/components/admin/AgencySidebar";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Lock } from "lucide-react";
import { GuidanceShell } from "@/components/guidance/GuidanceShell";

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

  // RCCF-62 — PLATFORM LOCK banner. Server-derived access state (never a
  // client flag). The lock is enforced on mutation actions server-side; this
  // banner is a truthful locked-account experience and keeps financial/read
  // surfaces accessible.
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  let locked = false;
  if (agencyId) {
    const { resolveAgencyAccess } = await import("@/modules/partner/application/access-lock");
    locked = (await resolveAgencyAccess(agencyId)).platformLocked;
  }

  return (
    <div className="min-h-screen bg-[var(--surface-root)] flex">
      <AgencySidebar />
      <div className="flex-1 min-w-0">
        {locked && (
          <div className="border-b border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm text-amber-300" data-testid="platform-locked-banner">
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4" aria-hidden="true" />
              Your Partner trial has ended. Subscribe to continue managing your client websites.
            </span>
          </div>
        )}
        <main className="p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" text="Loading..." /></div>}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <GuidanceShell audience="agency" helpContext="Clients" />
    </div>
  );
}
