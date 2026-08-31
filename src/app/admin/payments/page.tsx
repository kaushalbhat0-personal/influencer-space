import { ContentContainer, PageHeader } from "@/components/layout";
import { getMyPaymentAccounts } from "@/actions/payment-account.actions";
import { PaymentsMultiproviderClient } from "./_components/payments-client.multiprovider";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const data = await getMyPaymentAccounts();
  return (
    <ContentContainer>
      <PageHeader
        title="Payments"
        description="Choose how customers will pay you — funds land directly in your account."
        breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Payments" }]}
      />
      {data.ok ? <PaymentsMultiproviderClient initialAccounts={data.accounts ?? []} initialActive={data.activeProvider ?? null} initialReadiness={data.readiness ?? null} /> : <p className="text-sm text-red-400">{data.error}</p>}
    </ContentContainer>
  );
}
