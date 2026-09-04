"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS, STATUS_FILTER_OPTIONS } from "@/lib/products/constants";

interface ProductsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  total: number;
  selectedCount: number;
  onBulkPublish?: () => void;
  onBulkArchive?: () => void;
  onBulkDelete?: () => void;
}

export function ProductsToolbar({
  search, onSearchChange, statusFilter, onStatusFilterChange,
  sort, onSortChange, total, selectedCount,
  onBulkPublish, onBulkArchive, onBulkDelete,
}: ProductsToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className="admin-input w-full pl-9 pr-8"
            aria-label="Search products"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="admin-input w-full sm:w-40"
          aria-label="Sort products"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1" role="tablist" aria-label="Filter by status">
          {STATUS_FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => onStatusFilterChange(f.value)}
              role="tab"
              aria-selected={statusFilter === f.value}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--text-muted)] tabular-nums">
          {total} product{total !== 1 ? "s" : ""}
        </span>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 px-4 py-2">
          <span className="text-xs text-[var(--text-secondary)] tabular-nums">{selectedCount} selected</span>
          <div className="flex-1" />
          {onBulkPublish && (
            <button onClick={onBulkPublish} className="text-xs text-green-400 hover:text-green-300 font-medium transition-colors">
              Publish
            </button>
          )}
          {onBulkArchive && (
            <button onClick={onBulkArchive} className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors">
              Archive
            </button>
          )}
          {onBulkDelete && (
            <button onClick={onBulkDelete} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
