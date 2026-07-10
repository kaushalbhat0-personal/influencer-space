import { AffiliateForm } from "../_components/affiliate-form";

export default function NewAffiliatePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">
        Add Affiliate Link
      </h1>
      <AffiliateForm mode="create" />
    </div>
  );
}
