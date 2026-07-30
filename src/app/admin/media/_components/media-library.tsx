"use client";

import { useState, useEffect, useCallback } from "react";
import { CreatorImage } from "@/components/shared/CreatorImage";
import { MediaUploadField } from "@/components/shared/MediaUploadField";
import { listAssets, deleteAssetFromLibrary, purgeAsset } from "@/actions/media-library.actions";
import type { AssetFilters } from "@/lib/media/repositories/asset-queries";

interface AssetItem {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  blurHash?: string | null;
  dominantColor?: string | null;
  publicUrl?: string | null;
  thumbnailUrl?: string | null;
  storageProvider: string;
  referenceCount: number;
  status: string;
  processingStatus: string;
  processingError?: string | null;
  createdAt: string;
  references?: Array<{ entityType: string; entityId: string; field: string | null }>;
}

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

  async function handleDelete(assetId: string) {
    if (!window.confirm("Delete this asset? This action cannot be undone.")) return;
    const result = await deleteAssetFromLibrary(assetId);
    if (result.success) {
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      if (selectedId === assetId) { setSelectedId(null); setDetail(null); }
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

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center gap-3">
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
        </div>

        <div className="mb-2 text-xs text-zinc-500">{total} asset{total !== 1 ? "s" : ""}</div>

        {view === "grid" ? (
          <div className="grid grid-cols-4 gap-3">
            {loading && Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-zinc-800" />
            ))}
            {!loading && assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => { setSelectedId(asset.id); setDetail(asset); }}
                className={`group relative aspect-square overflow-hidden rounded-lg border transition-all ${
                  selectedId === asset.id
                    ? "border-s8ul-cyan ring-2 ring-s8ul-cyan/50"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {asset.publicUrl ? (
                  <CreatorImage src={asset.publicUrl} alt={asset.originalFilename} variant="thumbnail" className="h-full w-full" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-zinc-800">
                    <span className="text-xs text-zinc-600">No preview</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="truncate text-[10px] text-white/80">{asset.originalFilename}</p>
                </div>
                {asset.referenceCount === 0 && (
                  <div className="absolute right-1 top-1 rounded bg-amber-900/80 px-1.5 py-0.5 text-[9px] text-amber-300">
                    Unused
                  </div>
                )}
                {asset.processingStatus !== "READY" && asset.processingStatus !== "PENDING" && (
                  <div className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[9px] ${
                    asset.processingStatus === "FAILED" ? "bg-red-900/80 text-red-300" : "bg-blue-900/80 text-blue-300"
                  }`}>
                    {asset.processingStatus}
                  </div>
                )}
              </button>
            ))}
            {!loading && assets.length === 0 && (
              <div className="col-span-4 py-16 text-center">
                <p className="text-sm text-zinc-500">No assets found. Upload your first asset!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => { setSelectedId(asset.id); setDetail(asset); }}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${
                  selectedId === asset.id
                    ? "border-s8ul-cyan bg-s8ul-cyan/5"
                    : "border-white/5 hover:border-white/10"
                }`}
              >
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                  {asset.publicUrl ? (
                    <CreatorImage src={asset.publicUrl} alt="" variant="thumbnail" className="h-full w-full" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-600">N/A</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-300">{asset.originalFilename}</p>
                  <p className="text-[10px] text-zinc-600">{asset.mimeType} &middot; {formatSize(asset.size)}</p>
                </div>
                <span className="text-xs text-zinc-600">{asset.referenceCount} ref{asset.referenceCount !== 1 ? "s" : ""}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {detail && (
        <AssetDetailPanel
          asset={detail}
          onDelete={() => handleDelete(detail.id)}
          onPurge={() => handlePurge(detail.id)}
          onClose={() => { setSelectedId(null); setDetail(null); }}
        />
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AssetDetailPanel({
  asset,
  onDelete,
  onPurge,
  onClose,
}: {
  asset: AssetItem;
  onDelete: () => void;
  onPurge: () => void;
  onClose: () => void;
}) {
  const isVideo = asset.mimeType?.startsWith("video/");
  const isDeleted = asset.status === "DELETED";

  return (
    <div className="w-80 flex-shrink-0 space-y-4 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Asset Details</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white text-sm">&times;</button>
      </div>

      <div className="aspect-video overflow-hidden rounded-lg bg-zinc-800">
        {asset.publicUrl && !isVideo ? (
          <CreatorImage src={asset.publicUrl} alt={asset.originalFilename} variant="card" className="h-full w-full" />
        ) : asset.publicUrl && isVideo ? (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500">Video: {asset.originalFilename}</div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">No preview</div>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between"><span className="text-zinc-500">Filename</span><span className="text-zinc-300">{asset.originalFilename}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Type</span><span className="text-zinc-300">{asset.mimeType}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Size</span><span className="text-zinc-300">{formatSize(asset.size)}</span></div>
        {asset.width && asset.height && (
          <div className="flex justify-between"><span className="text-zinc-500">Dimensions</span><span className="text-zinc-300">{asset.width}&times;{asset.height}</span></div>
        )}
        <div className="flex justify-between"><span className="text-zinc-500">Provider</span><span className="text-zinc-300">{asset.storageProvider}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Status</span><span className={isDeleted ? "text-red-400" : "text-emerald-400"}>{asset.status}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Processing</span><span className={asset.processingStatus === "FAILED" ? "text-red-400" : asset.processingStatus === "READY" ? "text-emerald-400" : "text-amber-400"}>{asset.processingStatus}</span></div>
        {asset.processingError && <div className="flex justify-between"><span className="text-zinc-500">Error</span><span className="text-red-400 text-[10px] truncate max-w-[180px]" title={asset.processingError}>{asset.processingError}</span></div>}
        <div className="flex justify-between"><span className="text-zinc-500">References</span><span className="text-zinc-300">{asset.referenceCount}</span></div>
        {asset.dominantColor && (
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Color</span>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border border-white/10" style={{ backgroundColor: asset.dominantColor }} />
              <span className="text-zinc-300 text-[10px]">{asset.dominantColor}</span>
            </div>
          </div>
        )}
        {asset.duration && <div className="flex justify-between"><span className="text-zinc-500">Duration</span><span className="text-zinc-300">{asset.duration}s</span></div>}
        {asset.createdAt && (
          <div className="flex justify-between"><span className="text-zinc-500">Uploaded</span><span className="text-zinc-300">{new Date(asset.createdAt).toLocaleDateString()}</span></div>
        )}
      </div>

      {asset.references && asset.references.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold text-zinc-400">Used In</h4>
          <div className="space-y-1">
            {asset.references.map((ref, i) => (
              <div key={i} className="rounded bg-zinc-800/50 px-2 py-1 text-[10px] text-zinc-400">
                {ref.entityType} / {ref.field ?? "default"}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {!isDeleted && (
          <>
            <MediaUploadField
              label="Replace File"
              folder="replace"
              accept={isVideo ? "video/*" : "image/*"}
              onUploadComplete={async ({ url: _url }) => {
              }}
            />
            {asset.referenceCount === 0 ? (
              <button onClick={onDelete} className="w-full rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                Delete Asset
              </button>
            ) : (
              <p className="text-[10px] text-amber-500">Cannot delete: {asset.referenceCount} reference(s) exist</p>
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
