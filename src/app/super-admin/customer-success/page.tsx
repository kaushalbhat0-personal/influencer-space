import { getCustomerSuccessCenterData } from "@/actions/customer-success.actions";
import { SuccessCenterClient } from "./_components/success-center-client";

export const dynamic = "force-dynamic";

export default async function CustomerSuccessPage() {
  const data = await getCustomerSuccessCenterData();
  if (!data.ok || !data.center) return <div className="p-8 text-sm text-red-400">{data.error ?? "Unauthorized"}</div>;
  return <SuccessCenterClient center={data.center} />;
}
