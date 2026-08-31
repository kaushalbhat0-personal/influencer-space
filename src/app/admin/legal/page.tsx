import { requireTenant } from "@/lib/auth/require-tenant";
import { legalService } from "@/lib/legal/service";
import { LegalManager } from "./_components/legal-manager";

export const dynamic = "force-dynamic";

export default async function AdminLegalPage() {
  const { tenantId } = await requireTenant();
  const all = await legalService.getAll(tenantId);
  return <LegalManager initial={all} />;
}
