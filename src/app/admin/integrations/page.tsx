import { requireTenant } from "@/lib/auth/require-tenant";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { integrationService } from "@/features/integrations/service";
import { IntegrationsClient } from "@/features/integrations/components/integrations-client";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { entitlementService } from "@/lib/capabilities";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const { tenantId } = await requireTenant();

  const resolved = await resolveActivePlan(null, tenantId);
  const canIntegrate =
    entitlementService.has(resolved.code, "api_access") ||
    entitlementService.has(resolved.code, "webhooks") ||
    entitlementService.has(resolved.code, "live_social_sync");

  if (!canIntegrate) {
    return (
      <FeaturePage
        title="Integrations"
        description="Connect your accounts and services to keep your storefront connected to your audience."
      >
        <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
          <p className="text-sm text-amber-400">API access, webhooks and live social sync require a <span className="font-semibold">Creator Scale</span> subscription or higher.</p>
          <Link href="/admin/billing" className="mt-4 inline-block admin-btn-cyan px-6 py-2.5 text-sm">Upgrade Plan</Link>
        </div>
      </FeaturePage>
    );
  }

  const integrations = await integrationService.list(tenantId);

  return (
    <FeaturePage
      title="Integrations"
      description="Connect your accounts and services to keep your storefront connected to your audience."
    >
      <IntegrationsClient integrations={integrations} tenantId={tenantId} />
    </FeaturePage>
  );
}