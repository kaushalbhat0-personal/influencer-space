import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VercelService } from "@/services/vercel.service";
import { DomainSettings } from "./_components/domain-settings";
import type { VercelVerificationRecord } from "@/services/vercel.service";

export const dynamic = "force-dynamic";

export default async function DomainPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <div>
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Domain Settings</h1>
        <p className="mt-4 text-gray-400">No tenant configured. Please seed a tenant first.</p>
      </div>
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { customDomain: true, subdomain: true },
  });

  let verification: VercelVerificationRecord[] | undefined;
  let verified = false;

  if (tenant?.customDomain) {
    const status = await VercelService.getDomainStatus(tenant.customDomain);
    verified = status.verified;
    verification = status.verification;
  }

  return (
    <div>
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
    </div>
  );
}
