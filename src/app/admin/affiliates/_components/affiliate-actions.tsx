"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteAffiliate, toggleAffiliateActive } from "@/actions/affiliate.actions";
import { AFFILIATES_ROUTE } from "@/lib/constants";
import type { AffiliateData } from "@/services/affiliate.service";

export function AffiliateActions({ affiliate }: { affiliate: AffiliateData }) {
  const router = useRouter();

  async function handleToggle() {
    const result = await toggleAffiliateActive(affiliate.id);
    if (result.success) router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this affiliate?")) return;
    const result = await deleteAffiliate(affiliate.id);
    if (result.success) router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`${AFFILIATES_ROUTE}/${affiliate.id}/edit`}
        className="admin-btn-outline px-3 py-1.5 text-xs"
      >
        Edit
      </Link>
      <button onClick={handleToggle} className="admin-btn-gold px-3 py-1.5 text-xs">
        {affiliate.isActive ? "Deactivate" : "Activate"}
      </button>
      <button onClick={handleDelete} className="admin-btn-danger px-3 py-1.5 text-xs">
        Delete
      </button>
    </div>
  );
}
