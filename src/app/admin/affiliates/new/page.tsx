import { AffiliateForm } from "../_components/affiliate-form";

export default function NewAffiliatePage() {
  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-display">
        Add Affiliate Link
      </h1>
      <AffiliateForm mode="create" />
    </div>
  );
}
