import { notFound } from "next/navigation";
import { AffiliateService } from "@/services/affiliate.service";
import { AffiliateForm } from "../../_components/affiliate-form";

interface EditAffiliatePageProps {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function EditAffiliatePage({
  params,
}: EditAffiliatePageProps) {
  let affiliate;
  try {
    affiliate = await AffiliateService.findById(params.id);
  } catch {
    notFound();
  }
  if (!affiliate) notFound();

  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-gaming">Edit Affiliate</h1>
      <AffiliateForm mode="edit" affiliate={affiliate} />
    </div>
  );
}
