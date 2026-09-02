"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import {
  updateExistingGalleryItem, removeGalleryItem, updateGalleryOrder,
  publishGalleryItem, unpublishGalleryItem, archiveGalleryItem, restoreGalleryItem,
  toggleFeatured,
  bulkPublishGallery, bulkArchiveGallery, bulkDeleteGallery, bulkFeatureGallery,
} from "@/actions/gallery.actions";
import type { GalleryItemData } from "@/lib/gallery/types";
import { GalleryCard, GalleryCardSkeleton, GalleryCardEmpty } from "@/components/gallery/GalleryCard";
import { GalleryEditor } from "@/components/gallery/GalleryEditor";
import { GalleryAddDrawer } from "@/components/gallery/GalleryAddDrawer";
import { GalleryToolbar } from "@/components/gallery/GalleryToolbar";
import { Lightbox } from "@/components/gallery/Lightbox";
import { Plus } from "lucide-react";

const ITEMS_PER_PAGE = 24;

export function GalleryManager({
  tenantId,
  initialItems,
  initialTotal,
}: {
  tenantId: string;
  initialItems: GalleryItemData[];
  initialTotal: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  // Search & filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("");
  const [sort, setSort] = useState("order");
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; caption: string } | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Editor
  const [editingItem, setEditingItem] = useState<GalleryItemData | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const refreshItems = useCallback(async () => {
    setLoading(true);
    try {
      const { fetchGalleryItems } = await import("@/actions/gallery.actions");
      const result = await fetchGalleryItems({
        tenantId, search: search || undefined,
        status: statusFilter || undefined, mediaType: mediaTypeFilter || undefined,
        sort: sort || undefined, page, limit: ITEMS_PER_PAGE,
      });
      if (result.success && result.data) {
        setItems(result.data.items);
        setTotal(result.data.total);
      }
    } finally { setLoading(false); }
  }, [tenantId, search, statusFilter, mediaTypeFilter, sort, page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, mediaTypeFilter, sort]);

  useEffect(() => { refreshItems(); }, [page, search, statusFilter, mediaTypeFilter, sort]);

  // Bulk actions
  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => { const next = new Set(prev); if (checked) next.add(id); else next.delete(id); return next; });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }, [items, selected]);

  const withRefresh = (fn: () => Promise<unknown>) => async () => {
    await fn();
    setSelected(new Set());
    await refreshItems();
  };

  // Single item actions
  const handleEdit = useCallback((item: GalleryItemData) => { setEditingItem(item); setEditorOpen(true); }, []);
  const handlePreview = useCallback((item: GalleryItemData) => {
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) { setLightboxIndex(idx); setLightboxOpen(true); }
  }, [items]);

  const handleSave = useCallback(async (data: Record<string, unknown>) => {
    setSaving(true);
    try { await updateExistingGalleryItem(tenantId, data as Record<string, unknown> & { id: string }); setEditorOpen(false); setEditingItem(null); await refreshItems(); }
    finally { setSaving(false); }
  }, [tenantId, refreshItems]);

  const handleMove = useCallback((item: GalleryItemData, direction: -1 | 1) => {
    const idx = items.findIndex((i) => i.id === item.id);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= items.length) return;
    const updates = [
      { id: items[idx].id, order: items[target].order },
      { id: items[target].id, order: items[idx].order },
    ];
    startTransition(async () => {
      const result = await updateGalleryOrder(tenantId, updates);
      if (result.success) await refreshItems();
    });
  }, [items, tenantId, refreshItems, startTransition]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">Gallery</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Manage images and videos for your portfolio.</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="admin-btn-cyan flex items-center gap-2 px-4 py-2 text-xs">
          <Plus className="h-4 w-4" /> Add Media
        </button>
      </div>

      {/* Toolbar */}
      <GalleryToolbar
        search={search} onSearchChange={setSearch}
        statusFilter={statusFilter} onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
        mediaTypeFilter={mediaTypeFilter} onMediaTypeFilterChange={(v) => { setMediaTypeFilter(v); setPage(1); }}
        sort={sort} onSortChange={(v) => { setSort(v); setPage(1); }}
        total={total} selectedCount={selected.size}
        onBulkPublish={withRefresh(() => bulkPublishGallery(Array.from(selected), tenantId))}
        onBulkArchive={withRefresh(() => bulkArchiveGallery(Array.from(selected), tenantId))}
        onBulkDelete={() => setConfirmBulkDelete(selected.size)}
        onBulkFeature={withRefresh(() => bulkFeatureGallery(Array.from(selected), tenantId, true))}
      />

      {/* Select all */}
      {items.length > 0 && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={handleSelectAll}
            className="h-4 w-4 rounded border-[var(--border-strong)] bg-[var(--surface-hover)] text-s8ul-cyan focus:ring-s8ul-cyan/30" />
          <span className="text-xs text-[var(--text-muted)]">{selected.size === items.length ? "Deselect all" : "Select all"}</span>
        </label>
      )}

      {/* Loading */}
      {loading && items.length === 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <GalleryCardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty / Filtered Empty */}
      {!loading && items.length === 0 && (() => {
        const hasActiveFilter = !!(search || statusFilter || mediaTypeFilter);
        if (hasActiveFilter) {
          return (
            <GalleryCardEmpty
              filtered
              onCreate={() => { setSearch(""); setStatusFilter(""); setMediaTypeFilter(""); }}
            />
          );
        }
        return <GalleryCardEmpty onCreate={() => setAddOpen(true)} />;
      })()}

      {/* Grid */}
      {!loading && items.length > 0 && (
        <>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <GalleryCard
                key={item.id} item={item}
                selected={selected.has(item.id)} onSelect={handleSelect}
                onEdit={handleEdit} onPreview={handlePreview}
                onPublish={(id) => startTransition(async () => { await publishGalleryItem(id, tenantId); await refreshItems(); })}
                onUnpublish={(id) => startTransition(async () => { await unpublishGalleryItem(id, tenantId); await refreshItems(); })}
                onArchive={(id) => startTransition(async () => { await archiveGalleryItem(id, tenantId); await refreshItems(); })}
                onRestore={(id) => startTransition(async () => { await restoreGalleryItem(id, tenantId); await refreshItems(); })}
                onDelete={(id, caption) => setConfirmDelete({ id, caption })}
                onToggleFeatured={(id, featured) => startTransition(async () => { await toggleFeatured(id, tenantId, featured); await refreshItems(); })}
                onMoveLeft={(it) => handleMove(it, -1)}
                onMoveRight={(it) => handleMove(it, 1)}
                loading={pending}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="admin-btn-outline px-3 py-1.5 text-xs disabled:opacity-30">Previous</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${p === page ? "bg-s8ul-cyan/10 text-s8ul-cyan" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"}`}
                >{p}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="admin-btn-outline px-3 py-1.5 text-xs disabled:opacity-30">Next</button>
            </div>
          )}
        </>
      )}

      {/* Editor */}
      <GalleryEditor item={editingItem} open={editorOpen} onClose={() => { setEditorOpen(false); setEditingItem(null); }} onSave={handleSave} saving={saving} />

      {/* Add Media */}
      <GalleryAddDrawer
        tenantId={tenantId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={async () => { await refreshItems(); }}
      />

      {/* Lightbox */}
      <Lightbox items={items} currentIndex={lightboxIndex} open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(i) => setLightboxIndex(i)}
      />

      {/* Single Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={`Delete ${confirmDelete.caption || "gallery item"}`}>
          <div className="absolute inset-0 bg-[rgba(24,24,27,0.20)] backdrop-blur-sm" onClick={() => !isDeleting && setConfirmDelete(null)} />
          <div className="relative admin-card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete &quot;{confirmDelete.caption || "this item"}&quot;?</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">This will permanently delete the gallery item. This cannot be undone.</p>
            {deleteError && <p className="mt-3 text-xs text-red-600" role="alert">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={isDeleting} className="btn-secondary text-sm disabled:opacity-50">Cancel</button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  setDeleteError(null);
                  const res = await removeGalleryItem(confirmDelete.id, tenantId);
                  if (res.success) {
                    setConfirmDelete(null);
                    await refreshItems();
                  } else {
                    setDeleteError(res.error ?? "Failed to delete");
                  }
                  setIsDeleting(false);
                }}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Delete selected items">
          <div className="absolute inset-0 bg-[rgba(24,24,27,0.20)] backdrop-blur-sm" onClick={() => !isDeleting && setConfirmBulkDelete(null)} />
          <div className="relative admin-card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete {confirmBulkDelete} items?</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">This will permanently delete the selected items. This cannot be undone.</p>
            {deleteError && <p className="mt-3 text-xs text-red-600" role="alert">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmBulkDelete(null)} disabled={isDeleting} className="btn-secondary text-sm disabled:opacity-50">Cancel</button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  setDeleteError(null);
                  const res = await bulkDeleteGallery(Array.from(selected), tenantId);
                  if (res.success) {
                    setConfirmBulkDelete(null);
                    setSelected(new Set());
                    await refreshItems();
                  } else {
                    setDeleteError(res.error ?? "Failed to delete");
                  }
                  setIsDeleting(false);
                }}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
