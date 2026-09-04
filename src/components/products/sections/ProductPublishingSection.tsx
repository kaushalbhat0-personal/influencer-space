"use client";

import type { ProductStatus } from "@/lib/products/constants";

interface Props {
  status: ProductStatus;
  onStatusChange: (v: ProductStatus) => void;
  isFeatured: boolean;
  onFeaturedChange: (v: boolean) => void;
  disabled?: boolean;
}

export function ProductPublishingSection({ status, onStatusChange, isFeatured, onFeaturedChange, disabled }: Props) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-white mb-3">Status & Visibility</legend>
      <div className="space-y-4">
        <div>
          <label htmlFor="product-status" className="block text-xs font-medium text-zinc-400 mb-1.5">
            Status
          </label>
          <select
            id="product-status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as ProductStatus)}
            className="admin-input w-full sm:w-48"
            disabled={disabled}
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            id="product-featured"
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => onFeaturedChange(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/30"
          />
          <span className="text-xs text-zinc-400">Mark as featured product</span>
        </label>
      </div>
    </fieldset>
  );
}
