import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentContainer } from "@/components/layout";
import { VercelService } from "@/services/vercel.service";
import { DomainSettings } from "@/features/domains/components/domain-settings";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { entitlementService } from "@/lib/capabilities";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DomainPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <ContentContainer>
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Domain Settings</h1>
        <p className="mt-4 text-gray-400">No tenant configured. Please seed a tenant first.</p>
      </ContentContainer>
    );
  }

  const resolved = await resolveActivePlan(null, tenantId);
  const canCustomDomain = entitlementService.has(resolved.code, "custom_domain");
  if (!canCustomDomain) {
    return (
      <ContentContainer>
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Domain Settings</h1>
        <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
          <p className="text-sm text-amber-400">Custom domains require a <span className="font-semibold">Creator Scale</span> subscription or higher.</p>
          <Link href="/admin/billing" className="mt-4 inline-block admin-btn-cyan px-6 py-2.5 text-sm">Upgrade Plan</Link>
        </div>
      </ContentContainer>
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { customDomain: true, subdomain: true },
  });

  let verification: { type: string; domain: string; value: string }[] | undefined;
  let verified = false;

  if (tenant?.customDomain) {
    const status = await VercelService.getDomainStatus(tenant.customDomain);
    verified = status.verified;
    verification = status.verification;
  }

  return (
    <ContentContainer>
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Domain Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Attach your own custom domain to replace the default subdomain.
        </p>
      </div>
      <DomainSettings
        currentDomain={tenant?.customDomain ?? null}
        subdomain={tenant?.subdomain ?? ""}
        verified={verified}
        verification={verification ?? []}
      />
    </ContentContainer>
  );
}
