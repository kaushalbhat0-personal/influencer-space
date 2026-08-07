import { requireTenant } from "@/lib/auth/require-tenant";
import { goalRuntime } from "@/modules/goals-runtime";
import { GoalsSettingsPage } from "@/modules/goals-runtime/presentation/goals-settings-page";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const session = await requireTenant();
  const { snapshot, ...payload } = await goalRuntime.evaluate(session.tenantId);

  return <GoalsSettingsPage initial={payload} />;
}
