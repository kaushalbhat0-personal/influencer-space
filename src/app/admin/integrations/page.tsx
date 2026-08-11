import { requireTenant } from "@/lib/auth/require-tenant";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { integrationService } from "@/features/integrations/service";
import { IntegrationsClient } from "@/features/integrations/components/integrations-client";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const { tenantId } = await requireTenant();

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