"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { CreatorImage } from "@/components/shared/CreatorImage";
import {
  listAssets,
  purgeAsset,
  replaceAsset,
  deleteAssetsBulk,
} from "@/actions/media-library.actions";
import { uploadFileWithProgress } from "@/lib/media/client-upload";
import type { AssetFilters } from "@/lib/media/repositories/asset-queries";

interface Usage { label: string; href: string }

interface AssetItem {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  publicUrl?: string | null;
  storageProvider: string;
  referenceCount: number;
  status: string;
  processingStatus: string;
  processingError?: string | null;
  createdAt: string;
  updatedAt: string;
  used: boolean;
  usages?: Usage[];
}

interface BulkResult {
  success: boolean;
  deleted?: Array<{ assetId: string; bytes: number }>;
  blocked?: Array<{ assetId: string; filename: string; usages: Usage[] }>;
  failures?: string[];
  storageVerifiedRemoved?: number;
  error?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type FriendlyTone = "green" | "amber" | "red" | "zinc";

function statusInfo(asset: AssetItem): { label: string; tone: FriendlyTone } {
  if (asset.status === "DELETED") return { label: "Trashed", tone: "red" };
  if (asset.processingStatus === "FAILED") return { label: "Failed", tone: "red" };
  if (["QUEUED", "PENDING", "PROCESSING"].includes(asset.processingStatus)) {
    return { label: "Processing…", tone: "amber" };
  }
  return { label: "Ready", tone: "green" };
}

const TONE_CLASS: Record<FriendlyTone, string> = {
  green: "bg-emerald-900/70 text-emerald-300",
  amber: "bg-amber-900/70 text-amber-300",
  red: "bg-red-900/70 text-red-300",
  zinc: "bg-zinc-800/80 text-zinc-400",
};

export function MediaLibrary() {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mimeFilter, setMimeFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"createdAt" | "filename" | "size">("createdAt");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AssetItem | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Batch selection (IMPLEMENTATION-23) ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blockedAssets, setBlockedAssets] = useState<Array<{ assetId: string; filename: string; usages: Usage[] }>>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const filters: AssetFilters = {
      search: search || undefined,
      mimeType: mimeFilter || undefined,
      sortBy,
      sortOrder: "desc",
      limit: 100,
    };
    const result = await listAssets(filters);
    if (result.success) {
      setAssets(result.assets as unknown as AssetItem[]);
      setTotal(result.total);
    }
    setLoading(false);
  }, [search, mimeFilter, sortBy]);

  useEffect(() => { load(); }, [load]);

  const visibleIds = useCallback(() => assets.map((a) => a.id), [assets]);

  function toggleSelect(id: string, additive = false, range = false) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (range) {
        const ids = visibleIds();
        const last = Array.from(prev).pop();
        const from = last ? ids.indexOf(last) : 0;
        const to = ids.indexOf(id);
        if (from >= 0 && to >= 0) {
          const [lo, hi] = from <= to ? [from, to] : [to, from];
          for (let i = lo; i <= hi; i++) next.add(ids[i]!);
          return next;
        }
      }
      if (additive) {
        if (next.has(id)) next.delete(id); else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected(new Set(visibleIds()));
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return;
    setBusy(true);
    setNotice(null);
    setConfirmOpen(false);
    const result = (await deleteAssetsBulk([...Array.from(selected)])) as BulkResult;
    setBusy(false);
    if (result.success) {
      setSelected(new Set());
      setBlockedAssets([]);
      const storageText = typeof result.storageVerifiedRemoved === "number" ? ` · ${result.storageVerifiedRemoved} storage object${result.storageVerifiedRemoved !== 1 ? "s" : ""} removed.` : "";
      setNotice({ kind: "ok", text: `Deleted ${result.deleted?.length ?? 0} asset${(result.deleted?.length ?? 0) !== 1 ? "s" : ""}${storageText}` });
      if (result.blocked && result.blocked.length > 0) setBlockedAssets(result.blocked);
      await load();
    } else if (result.blocked && result.blocked.length > 0) {
      setBlockedAssets(result.blocked);
      setNotice({ kind: "err", text: `${result.blocked.length} asset(s) are still in use and were not deleted.` });
    } else {
      setNotice({ kind: "err", text: result.error ?? "Batch delete failed" });
    }
  }

  async function handleUploadFile(file: File) {
    setUploading(true);
    setUploadProgress(0);
    const result = await uploadFileWithProgress({ file, folder: "library", onProgress: setUploadProgress });
    if (result.success) {
      await load();
      if (result.assetId) setSelectedId(result.assetId);
    }
    setUploading(false);
    setUploadProgress(0);
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  async function handleDeleteOne(assetId: string) {
    if (!window.confirm("Delete this asset? This action cannot be undone.")) return;
    const result = (await deleteAssetsBulk([assetId])) as BulkResult;
    if (result.success) {
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      if (selectedId === assetId) { setSelectedId(null); setDetail(null); }
      setNotice({ kind: "ok", text: `Deleted ${result.deleted?.length ?? 0} asset.` });
    } else if (result.blocked && result.blocked.length > 0) {
      setBlockedAssets(result.blocked);
    } else {
      setNotice({ kind: "err", text: result.error ?? "Delete failed" });
    }
  }

  async function handlePurge(assetId: string) {
    if (!window.confirm("Permanently delete this asset? This will remove the file from storage.")) return;
    const result = await purgeAsset(assetId);
    if (result.success) {
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      if (selectedId === assetId) { setSelectedId(null); setDetail(null); }
    }
  }

  async function copyUrl(url: string) {
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard unavailable */ }
  }

  const videos = assets.filter((a) => a.mimeType?.startsWith("video/")).length;
  const images = assets.filter((a) => !a.mimeType?.startsWith("video/")).length;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600"
          />
          <select
            value={mimeFilter}
            onChange={(e) => setMimeFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 outline-none"
          >
            <option value="">All types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "createdAt" | "filename" | "size")}
            className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 outline-none"
          >
            <option value="createdAt">Newest</option>
            <option value="filename">Name</option>
            <option value="size">Size</option>
          </select>
          <button
            onClick={() => setView(view === "grid" ? "list" : "grid")}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            {view === "grid" ? "List" : "Grid"}
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-s8ul-cyan px-3 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90">
            <input
              ref={uploadInputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); }}
              disabled={uploading}
            />
            {uploading ? `Uploading… ${uploadProgress}%` : "Upload"}
          </label>
        </div>

        {uploading && (
          <div className="mb-4 rounded-lg border border-white/10 bg-zinc-900 p-3">
            <div className="mb-1 flex justify-between text-[10px] text-zinc-500">
              <span>Uploading…</span><span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-s8ul-cyan transition-all duration-200" style={{ width: `${Math.max(uploadProgress, 4)}%` }} />
            </div>
          </div>
        )}

        {/* Batch selection toolbar */}
        {selected.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-s8ul-cyan/30 bg-s8ul-cyan/5 px-3 py-2" data-testid="batch-toolbar">
            <span className="text-xs font-semibold text-s8ul-cyan">{selected.size} Selected</span>
            <div className="mx-1 h-4 w-px bg-white/10" />
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
              data-testid="batch-delete"
              className="rounded-md border border-red-500/40 px-2.5 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              disabled={busy}
              className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              Deselect
            </button>
            <span className="mx-1 h-4 w-px bg-white/10" />
            <button
              onClick={selectAllFiltered}
              className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:bg-white/5"
            >
              Select all filtered ({assets.length})
            </button>
          </div>
        )}

        {notice && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-xs ${notice.kind === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
            {notice.text}
          </div>
        )}

        <div className="mb-2 flex items-center gap-3 text-xs text-zinc-500">
          <span>{total} asset{total !== 1 ? "s" : ""}</span>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={selected.size === assets.length && assets.length > 0} onChange={() => (selected.size === assets.length ? setSelected(new Set()) : selectAllFiltered())} className="h-3.5 w-3.5 accent-s8ul-cyan" />
            Select all
          </label>
        </div>

        {assets.length === 0 && !loading ? (
          <EmptyState onUpload={() => uploadInputRef.current?.click()} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {loading && Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-zinc-800" />
            ))}
            {!loading && assets.map((asset) => (
              <MediaCard
                key={asset.id}
                asset={asset}
                selected={selected.has(asset.id)}
                detailSelected={selectedId === asset.id}
                onSelect={() => { setSelectedId(asset.id); setDetail(asset); }}
                onToggleSelected={() => toggleSelect(asset.id, true)}
                onRangeSelect={() => toggleSelect(asset.id, true, true)}
                onCopyUrl={() => copyUrl(asset.publicUrl ?? "")}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => { setSelectedId(asset.id); setDetail(asset); }}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${selectedId === asset.id ? "border-s8ul-cyan bg-s8ul-cyan/5" : "border-white/5 hover:border-white/10"}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(asset.id)}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(asset.id, true); }}
                  onChange={() => {}}
                  className="h-3.5 w-3.5 accent-s8ul-cyan"
                />
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                  {asset.publicUrl ? (
                    asset.mimeType?.startsWith("video/") ? (
                      <video src={asset.publicUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      <CreatorImage src={asset.publicUrl} alt="" variant="thumbnail" className="h-full w-full" />
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-600">N/A</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-300">{asset.originalFilename}</p>
                  <p className="text-[10px] text-zinc-600">
                    {asset.mimeType} · {formatSize(asset.size)}
                    {asset.mimeType?.startsWith("video/") && asset.duration ? ` · ${formatDuration(asset.duration)}` : ""}
                  </p>
                </div>
                <UsageBadge used={asset.used} />
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${TONE_CLASS[statusInfo(asset).tone]}`}>
                  {statusInfo(asset).label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {detail && (
        <AssetDetailPanel
          asset={detail}
          onDelete={() => handleDeleteOne(detail.id)}
          onPurge={() => handlePurge(detail.id)}
          onReplaced={() => load()}
          onClose={() => { setSelectedId(null); setDetail(null); }}
          onCopyUrl={() => copyUrl(detail.publicUrl ?? "")}
        />
      )}

      {/* Batch delete confirmation */}
      {confirmOpen && (
        <BatchConfirmDialog
          count={selected.size}
          videos={assets.filter((a) => selected.has(a.id) && a.mimeType?.startsWith("video/")).length}
          images={assets.filter((a) => selected.has(a.id) && !a.mimeType?.startsWith("video/")).length}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleBatchDelete}
        />
      )}

      {/* Reference block dialog */}
      {blockedAssets.length > 0 && (
        <BlockedDialog assets={blockedAssets} onClose={() => setBlockedAssets([])} />
      )}
    </div>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-20 text-center" data-testid="media-empty-state">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
        <svg className="h-8 w-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-zinc-300">No media yet</h3>
      <p className="mt-1 max-w-xs text-xs text-zinc-500">Upload images or videos to use across your hero, gallery and products. Drop files anywhere or use the upload button.</p>
      <button onClick={onUpload} className="mt-4 rounded-lg bg-s8ul-cyan px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90">
        Upload Media
      </button>
    </div>
  );
}

function UsageBadge({ used }: { used: boolean }) {
  if (used) return <span className="rounded-full bg-emerald-900/70 px-2 py-0.5 text-[9px] font-medium text-emerald-300">Used</span>;
  return <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[9px] font-medium text-zinc-400">Unused</span>;
}

function MediaCard({
  asset, selected, detailSelected, onSelect, onToggleSelected, onRangeSelect, onCopyUrl,
}: {
  asset: AssetItem; selected: boolean; detailSelected: boolean;
  onSelect: () => void; onToggleSelected: () => void; onRangeSelect: () => void; onCopyUrl: () => void;
}) {
  const isVideo = asset.mimeType?.startsWith("video/");
  const status = statusInfo(asset);
  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
        else if (e.ctrlKey || e.metaKey) onToggleSelected();
      }}
      className={`group relative aspect-square overflow-hidden rounded-lg border transition-all cursor-pointer ${
        detailSelected || selected
          ? "border-s8ul-cyan ring-2 ring-s8ul-cyan/50"
          : "border-white/10 hover:border-white/30"
      }`}
    >
      {asset.publicUrl ? (
        isVideo ? (
          <video src={asset.publicUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <CreatorImage src={asset.publicUrl} alt={asset.originalFilename} variant="thumbnail" className="h-full w-full" />
        )
      ) : (
        <div className="flex h-full items-center justify-center bg-zinc-800">
          <span className="text-xs text-zinc-600">No preview</span>
        </div>
      )}

      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
            <svg className="ml-0.5 h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Selection checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => {}}
        onClick={(e) => {
          e.stopPropagation();
          if (e.shiftKey) onRangeSelect();
          else onToggleSelected();
        }}
        className="absolute left-1.5 top-1.5 z-10 h-3.5 w-3.5 accent-s8ul-cyan"
      />

      {/* status + usage */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-end p-1.5 pl-7">
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${TONE_CLASS[status.tone]}`}>{status.label}</span>
      </div>
      <div className="absolute right-1.5 top-6">
        <UsageBadge used={asset.used} />
      </div>

      {/* meta — always visible on touch/mobile, hover-revealed on desktop */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
        <p className="truncate text-[10px] text-white/85">{asset.originalFilename}</p>
        <p className="text-[9px] text-zinc-400">
          {formatSize(asset.size)}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
          {isVideo && asset.duration ? ` · ${formatDuration(asset.duration)}` : ""}
        </p>
        <div className="mt-1 flex gap-1">
          <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onSelect(); }} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-white hover:bg-white/20">Preview</span>
          <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onCopyUrl(); }} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-white hover:bg-white/20">Copy URL</span>
        </div>
      </div>
    </div>
  );
}

function BatchConfirmDialog({ count, videos, images, onCancel, onConfirm }: {
  count: number; videos: number; images: number; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-white">Delete {count} asset{count !== 1 ? "s" : ""}?</h3>
        <p className="mt-2 text-xs text-zinc-400">
          This action cannot be undone. {count} file{count !== 1 ? "s" : ""} will be removed:
        </p>
        <div className="mt-2 flex gap-2 text-[10px]">
          <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">{videos} video{videos !== 1 ? "s" : ""}</span>
          <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">{images} image{images !== 1 ? "s" : ""}</span>
        </div>
        <p className="mt-2 text-[10px] text-amber-500/80">Storage objects will also be removed.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">Cancel</button>
          <button onClick={onConfirm} data-testid="batch-delete-confirm" className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500">Delete</button>
        </div>
      </div>
    </div>
  );
}

function BlockedDialog({ assets, onClose }: {
  assets: Array<{ assetId: string; filename: string; usages: Usage[] }>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-white">Cannot delete referenced assets</h3>
        <p className="mt-1 text-xs text-zinc-400">These assets are still in use. Remove them from their sections first, or replace them.</p>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {assets.map((a) => (
            <div key={a.assetId} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-zinc-200">{a.filename}</p>
              <p className="mt-1 text-[10px] text-zinc-500">Used in:</p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {a.usages.map((u, i) => (
                  <Link key={i} href={u.href} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-s8ul-cyan hover:bg-zinc-700">
                    {u.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-s8ul-cyan px-4 py-1.5 text-xs font-semibold text-black hover:opacity-90">OK</button>
        </div>
      </div>
    </div>
  );
}

function AssetDetailPanel({
  asset, onDelete, onPurge, onReplaced, onClose, onCopyUrl,
}: {
  asset: AssetItem; onDelete: () => void; onPurge: () => void; onReplaced: () => void; onClose: () => void; onCopyUrl: () => void;
}) {
  const isVideo = asset.mimeType?.startsWith("video/");
  const isDeleted = asset.status === "DELETED";
  const status = statusInfo(asset);
  const usages = asset.usages ?? [];

  return (
    <div className="w-full flex-shrink-0 space-y-4 rounded-xl border border-white/10 bg-zinc-900/50 p-4 lg:w-80">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Asset Details</h3>
        <button onClick={onClose} aria-label="Close dialog" className="text-zinc-500 hover:text-white text-sm">&times;</button>
      </div>

      <div className="aspect-video overflow-hidden rounded-lg bg-zinc-800">
        {asset.publicUrl && !isVideo ? (
          <CreatorImage src={asset.publicUrl} alt={asset.originalFilename} variant="card" className="h-full w-full" />
        ) : asset.publicUrl && isVideo ? (
          <video src={asset.publicUrl} controls className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">No preview</div>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between"><span className="text-zinc-500">Name</span><span className="max-w-[180px] truncate text-zinc-300">{asset.originalFilename}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Type</span><span className="text-zinc-300">{asset.mimeType}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Size</span><span className="text-zinc-300">{formatSize(asset.size)}</span></div>
        {asset.width && asset.height && (
          <div className="flex justify-between"><span className="text-zinc-500">Resolution</span><span className="text-zinc-300">{asset.width}&times;{asset.height}</span></div>
        )}
        {isVideo && (
          <div className="flex justify-between"><span className="text-zinc-500">Duration</span><span className="text-zinc-300">{formatDuration(asset.duration) || "—"}</span></div>
        )}
        <div className="flex justify-between"><span className="text-zinc-500">Storage Provider</span><span className="text-zinc-300">{asset.storageProvider}</span></div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Status</span>
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${TONE_CLASS[status.tone]}`}>{status.label}</span>
        </div>
        <div className="flex justify-between"><span className="text-zinc-500">Used</span><span className={asset.used ? "text-emerald-400" : "text-zinc-500"}>{asset.used ? "Used" : "Unused"}</span></div>
        {asset.processingError && (
          <div className="flex justify-between"><span className="text-zinc-500">Error</span><span className="max-w-[180px] truncate text-[10px] text-red-400" title={asset.processingError}>{asset.processingError}</span></div>
        )}
        <div className="flex justify-between"><span className="text-zinc-500">Created</span><span className="text-zinc-300">{formatDate(asset.createdAt)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Last Updated</span><span className="text-zinc-300">{formatDate(asset.updatedAt)}</span></div>
      </div>

      {usages.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold text-zinc-400">Used In</h4>
          <div className="space-y-1">
            {usages.map((u, i) => (
              <Link key={i} href={u.href} className="block truncate rounded bg-zinc-800/50 px-2 py-1 text-[10px] text-s8ul-cyan transition-colors hover:bg-zinc-800">
                {u.label} →
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <button onClick={onCopyUrl} className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 transition-colors">Copy URL</button>
        {!isDeleted && (
          <>
            <ReplaceFileControl assetId={asset.id} onReplaced={onReplaced} isVideo={isVideo} />
            {!asset.used ? (
              <button onClick={onDelete} className="w-full rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                Delete Asset
              </button>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[10px] text-amber-400">
                This asset is in use. Replace it instead of deleting.
              </div>
            )}
          </>
        )}
        {isDeleted && (
          <button onClick={onPurge} className="w-full rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400 hover:bg-red-900/50 transition-colors">
            Purge from Storage
          </button>
        )}
      </div>
    </div>
  );
}

function ReplaceFileControl({ assetId, onReplaced, isVideo }: {
  assetId: string; onReplaced: () => void; isVideo: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatus("idle");
    setMessage("");
    const formData = new FormData();
    formData.set("file", file);
    const result = await replaceAsset(assetId, formData);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (result.success) {
      setStatus("success");
      setMessage("File replaced");
      onReplaced();
    } else {
      setStatus("error");
      setMessage(result.error ?? "Replace failed");
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-400">Replace File</label>
      {uploading ? (
        <div className="rounded-lg border border-white/10 bg-zinc-900 p-2">
          <p className="text-center text-[10px] text-zinc-400">Replacing…</p>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300">
          <input ref={inputRef} type="file" accept={isVideo ? "video/*" : "image/*"} onChange={handleFile} className="hidden" disabled={uploading} />
          Choose New File
        </label>
      )}
      {status === "success" && <p className="text-[10px] text-emerald-400">{message}</p>}
      {status === "error" && <p className="text-[10px] text-red-400">{message}</p>}
    </div>
  );
}
