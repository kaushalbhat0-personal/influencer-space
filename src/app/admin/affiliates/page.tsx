import Link from "next/link";
import { AffiliateService } from "@/services/affiliate.service";
import { AffiliatesList } from "./_components/affiliates-list";
import { AFFILIATES_ROUTE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminAffiliatesPage() {
  const affiliates = await AffiliateService.findAll();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Affiliate Links</h1>
          <p className="text-sm text-gray-400">
            Manage your affiliate partnerships
          </p>
        </div>
        <Link
          href={`${AFFILIATES_ROUTE}/new`}
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400"
        >
          + New Affiliate
        </Link>
      </div>

      <AffiliatesList affiliates={affiliates} />
    </div>
  );
}
