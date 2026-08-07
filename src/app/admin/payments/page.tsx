import { ContentContainer, PageHeader } from "@/components/layout";
import { getMyPaymentAccount } from "@/actions/payment-account.actions";
import { PaymentsClient } from "./_components/payments-client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const data = await getMyPaymentAccount();
  return (
    <ContentContainer>
      <PageHeader
        title="Payments"
        description="Connect your payment account to receive product revenue directly — CreatorStore never takes a transaction fee."
        breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Payments" }]}
      />
      <PaymentsClient account={data.account ?? null} readiness={data.readiness ?? null} error={data.ok ? undefined : data.error} />
    </ContentContainer>
  );
}
