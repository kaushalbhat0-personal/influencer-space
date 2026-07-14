import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";
import { getTenantContext } from "@/lib/tenant";

export default async function LoginPage() {
  const tenant = await getTenantContext().catch(() => null);

  return (
    <Suspense>
      <LoginForm tenantId={tenant?.id ?? null} />
    </Suspense>
  );
}
