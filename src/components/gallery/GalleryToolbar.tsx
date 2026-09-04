"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GALLERY_SORT_OPTIONS, GALLERY_STATUS_FILTERS, GALLERY_MEDIA_TYPE_FILTERS } from "@/lib/gallery/constants";

interface GalleryToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  mediaTypeFilter: string;
  onMediaTypeFilterChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  total: number;
  selectedCount: number;
  onBulkPublish?: () => void;
  onBulkArchive?: () => void;
  onBulkDelete?: () => void;
  onBulkFeature?: () => void;
}

export function GalleryToolbar({
  search, onSearchChange, statusFilter, onStatusFilterChange,
  mediaTypeFilter, onMediaTypeFilterChange,
  sort, onSortChange, total, selectedCount,
  onBulkPublish, onBulkArchive, onBulkDelete, onBulkFeature,
}: GalleryToolbarProps) {
  return (
    <div className="space-y-3">
      {/* Search + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
          <input value={search} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search media..."
            className="admin-input w-full pl-9 pr-8" aria-label="Search gallery"
          />
          {search && (
            <button onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select value={sort} onChange={(e) => onSortChange(e.target.value)}
          className="admin-input w-full sm:w-40" aria-label="Sort gallery"
        >
          {GALLERY_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1" role="tablist" aria-label="Filter by status">
          {GALLERY_STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => onStatusFilterChange(f.value)}
              role="tab" aria-selected={statusFilter === f.value}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === f.value ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-white/5" />
        <div className="flex items-center gap-1">
          {GALLERY_MEDIA_TYPE_FILTERS.map((f) => (
            <button key={f.value} onClick={() => onMediaTypeFilterChange(f.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                mediaTypeFilter === f.value ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-[var(--text-muted)] tabular-nums">{total} item{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Bulk actions */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 px-4 py-2">
          <span className="text-xs text-[var(--text-secondary)] tabular-nums">{selectedCount} selected</span>
          <div className="flex-1" />
          {onBulkPublish && <button onClick={onBulkPublish} className="text-xs text-green-400 hover:text-green-300 font-medium">Publish</button>}
          {onBulkArchive && <button onClick={onBulkArchive} className="text-xs text-amber-400 hover:text-amber-300 font-medium">Archive</button>}
          {onBulkFeature && <button onClick={onBulkFeature} className="text-xs text-amber-400 hover:text-amber-300 font-medium">Feature</button>}
          {onBulkDelete && <button onClick={onBulkDelete} className="text-xs text-red-400 hover:text-red-300 font-medium">Delete</button>}
        </div>
      )}
    </div>
  );
}
