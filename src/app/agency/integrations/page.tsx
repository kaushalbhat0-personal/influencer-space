import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAgencyActive, canMutate } from "@/modules/partner/application/authorization";
import { getAgencyTenantIdForRead } from "@/modules/tenant-integration/agency-tenant";
import { getTenantResendIntegration } from "@/modules/tenant-integration/resend";
import { AgencyResendCard } from "./_components/agency-resend-card";

export const dynamic = "force-dynamic";

export default async function AgencyIntegrationsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "AGENCY_ADMIN" && role !== "AGENCY_STAFF") redirect("/admin/login");

  const active = await requireAgencyActive().catch(() => null);
  if (!active?.ok) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold text-white">Integrations</h1>
        <p className="mt-2 text-sm text-amber-400">{active?.error ?? "Agency not active"}</p>
      </div>
    );
  }

  const agencyId = (session?.user as { agencyId?: string })?.agencyId as string;
  const isAdmin = canMutate(role);
  const tenantId = await getAgencyTenantIdForRead(agencyId).catch(() => null);
  const integration = tenantId ? await getTenantResendIntegration(tenantId).catch(() => null) : null;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Agency Integrations</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Connect your own Resend account to send agency emails from your domain. Your Resend account pays for these
          emails — Pendallo never uses its global key for agency-owned mail.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-zinc-400">
          <li>Add and verify your sending domain in Resend (resend.com/domains).</li>
          <li>Add the verified From address (e.g. Agency &lt;noreply@yourdomain.com&gt;).</li>
          <li>Your API key is encrypted with AES-256-GCM and never logged.</li>
          <li>Without Resend, invitation links can still be shared manually — Resend is optional and not required to create or publish websites.</li>
        </ul>
        {!isAdmin && (
          <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
            Only agency admins can manage Resend credentials. You have view access.
          </p>
        )}
      </div>

      <AgencyResendCard initial={integration} isAdmin={isAdmin} />
    </div>
  );
}
