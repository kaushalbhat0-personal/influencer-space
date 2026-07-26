"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import {
  updateExistingGalleryItem, removeGalleryItem,
  publishGalleryItem, unpublishGalleryItem, archiveGalleryItem, restoreGalleryItem,
  toggleFeatured,
  bulkPublishGallery, bulkArchiveGallery, bulkDeleteGallery, bulkFeatureGallery,
} from "@/actions/gallery.actions";
import type { GalleryItemData } from "@/actions/gallery.actions";
import { GalleryCard, GalleryCardSkeleton, GalleryCardEmpty } from "@/components/gallery/GalleryCard";
import { GalleryEditor } from "@/components/gallery/GalleryEditor";
import { GalleryToolbar } from "@/components/gallery/GalleryToolbar";
import { Lightbox } from "@/components/gallery/Lightbox";

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

  // Editor
  const [editingItem, setEditingItem] = useState<GalleryItemData | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Gallery</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage images and videos for your portfolio.</p>
        </div>
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
        onBulkDelete={withRefresh(() => { if (!window.confirm(`Delete ${selected.size} items?`)) throw new Error(); return bulkDeleteGallery(Array.from(selected), tenantId); })}
        onBulkFeature={withRefresh(() => bulkFeatureGallery(Array.from(selected), tenantId, true))}
      />

      {/* Select all */}
      {items.length > 0 && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={handleSelectAll}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-s8ul-cyan focus:ring-s8ul-cyan/30" />
          <span className="text-xs text-zinc-500">{selected.size === items.length ? "Deselect all" : "Select all"}</span>
        </label>
      )}

      {/* Loading */}
      {loading && items.length === 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <GalleryCardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && <GalleryCardEmpty />}

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
                onDelete={(id, caption) => { if (!window.confirm(`Delete "${caption || "this item"}"?`)) return; startTransition(async () => { await removeGalleryItem(id, tenantId); await refreshItems(); }); }}
                onToggleFeatured={(id, featured) => startTransition(async () => { await toggleFeatured(id, tenantId, featured); await refreshItems(); })}
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
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${p === page ? "bg-s8ul-cyan/10 text-s8ul-cyan" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
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

      {/* Lightbox */}
      <Lightbox items={items} currentIndex={lightboxIndex} open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(i) => setLightboxIndex(i)}
      />
    </div>
  );
}
