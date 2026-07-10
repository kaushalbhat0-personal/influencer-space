"use client";

import { useRouter } from "next/navigation";
import { deleteAffiliate, toggleAffiliateActive } from "@/actions/affiliate.actions";
import { AFFILIATES_ROUTE } from "@/lib/constants";
import type { AffiliateData } from "@/services/affiliate.service";

export function AffiliateActions({
  affiliate,
}: {
  affiliate: AffiliateData;
}) {
  const router = useRouter();

  async function handleToggle() {
    const result = await toggleAffiliateActive(affiliate.id);
    if (result.success) {
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this affiliate?")) return;
    const result = await deleteAffiliate(affiliate.id);
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <a
        href={`${AFFILIATES_ROUTE}/${affiliate.id}/edit`}
        onClick={(e) => {
          e.preventDefault();
          router.push(`${AFFILIATES_ROUTE}/${affiliate.id}/edit`);
        }}
        className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
      >
        Edit
      </a>
      <button
        onClick={handleToggle}
        className="rounded-md bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        {affiliate.isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        onClick={handleDelete}
        className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
      >
        Delete
      </button>
    </div>
  );
}
