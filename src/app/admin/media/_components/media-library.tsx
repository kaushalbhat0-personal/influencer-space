"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { CreatorImage } from "@/components/shared/CreatorImage";
import {
  listAssets,
  deleteAssetFromLibrary,
  purgeAsset,
  replaceAsset,
  resolveAssetReferences,
} from "@/actions/media-library.actions";
import { uploadFileWithProgress } from "@/lib/media/client-upload";
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
  updatedAt: string;
  references?: Array<{ entityType: string; entityId: string; field: string | null }>;
}

interface Usage { label: string; href: string }

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

  async function handleUploadFile(file: File) {
    setUploading(true);
    setUploadProgress(0);
    const result = await uploadFileWithProgress({
      file,
      folder: "library",
      onProgress: setUploadProgress,
    });
    if (result.success) {
      await load();
      if (result.assetId) setSelectedId(result.assetId);
    }
    setUploading(false);
    setUploadProgress(0);
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

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

  async function copyUrl(url: string) {
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard unavailable */ }
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

        <div className="mb-2 text-xs text-zinc-500">{total} asset{total !== 1 ? "s" : ""}</div>

        {view === "grid" ? (
          <div className="grid grid-cols-4 gap-3">
            {loading && Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-zinc-800" />
            ))}
            {!loading && assets.map((asset) => (
              <MediaCard
                key={asset.id}
                asset={asset}
                selected={selectedId === asset.id}
                onSelect={() => { setSelectedId(asset.id); setDetail(asset); }}
                onDelete={() => handleDelete(asset.id)}
                onCopyUrl={() => copyUrl(asset.publicUrl ?? "")}
              />
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
                <UsageBadge count={asset.referenceCount} />
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
          onDelete={() => handleDelete(detail.id)}
          onPurge={() => handlePurge(detail.id)}
          onReplaced={() => load()}
          onClose={() => { setSelectedId(null); setDetail(null); }}
          onCopyUrl={() => copyUrl(detail.publicUrl ?? "")}
        />
      )}
    </div>
  );
}

function UsageBadge({ count }: { count: number }) {
  if (count > 0) {
    return <span className="rounded-full bg-emerald-900/70 px-2 py-0.5 text-[9px] font-medium text-emerald-300">Used</span>;
  }
  return <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[9px] font-medium text-zinc-400">Unused</span>;
}

function MediaCard({
  asset,
  selected,
  onSelect,
  onDelete,
  onCopyUrl,
}: {
  asset: AssetItem;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onCopyUrl: () => void;
}) {
  const isVideo = asset.mimeType?.startsWith("video/");
  const status = statusInfo(asset);
  return (
    <button
      onClick={onSelect}
      className={`group relative aspect-square overflow-hidden rounded-lg border transition-all ${
        selected
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

      {/* status + usage */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5">
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${TONE_CLASS[status.tone]}`}>
          {status.label}
        </span>
        <UsageBadge count={asset.referenceCount} />
      </div>

      {/* meta on hover */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="truncate text-[10px] text-white/85">{asset.originalFilename}</p>
        <p className="text-[9px] text-zinc-400">
          {formatSize(asset.size)}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
          {isVideo && asset.duration ? ` · ${formatDuration(asset.duration)}` : ""}
        </p>
        <div className="mt-1 flex gap-1">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-white hover:bg-white/20"
          >
            Preview
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onCopyUrl(); }}
            className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-white hover:bg-white/20"
          >
            Copy URL
          </span>
        </div>
      </div>
    </button>
  );
}

function AssetDetailPanel({
  asset,
  onDelete,
  onPurge,
  onReplaced,
  onClose,
  onCopyUrl,
}: {
  asset: AssetItem;
  onDelete: () => void;
  onPurge: () => void;
  onReplaced: () => void;
  onClose: () => void;
  onCopyUrl: () => void;
}) {
  const isVideo = asset.mimeType?.startsWith("video/");
  const isDeleted = asset.status === "DELETED";
  const status = statusInfo(asset);
  const [usages, setUsages] = useState<Usage[]>([]);

  useEffect(() => {
    setUsages([]);
    if (asset.referenceCount > 0) {
      resolveAssetReferences(asset.id).then((r) => {
        if (r.success) setUsages(r.usages as Usage[]);
      });
    }
  }, [asset.id, asset.referenceCount]);

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
        {asset.processingError && (
          <div className="flex justify-between"><span className="text-zinc-500">Error</span><span className="max-w-[180px] truncate text-[10px] text-red-400" title={asset.processingError}>{asset.processingError}</span></div>
        )}
        <div className="flex justify-between"><span className="text-zinc-500">Used In</span><span className="text-zinc-300">{asset.referenceCount} place{asset.referenceCount !== 1 ? "s" : ""}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Created</span><span className="text-zinc-300">{formatDate(asset.createdAt)}</span></div>
        <div className="flex justify-between"><span className="text-zinc-500">Last Updated</span><span className="text-zinc-300">{formatDate(asset.updatedAt)}</span></div>
      </div>

      {usages.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold text-zinc-400">Used In</h4>
          <div className="space-y-1">
            {usages.map((u, i) => (
              <Link
                key={i}
                href={u.href}
                className="block truncate rounded bg-zinc-800/50 px-2 py-1 text-[10px] text-s8ul-cyan transition-colors hover:bg-zinc-800 hover:text-s8ul-cyan"
              >
                {u.label} →
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <button onClick={onCopyUrl} className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 transition-colors">
          Copy URL
        </button>
        {!isDeleted && (
          <>
            <ReplaceFileControl assetId={asset.id} onReplaced={onReplaced} isVideo={isVideo} />
            {asset.referenceCount === 0 ? (
              <button onClick={onDelete} className="w-full rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                Delete Asset
              </button>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[10px] text-amber-400">
                This asset is used in {asset.referenceCount} place{asset.referenceCount !== 1 ? "s" : ""}. Replace it instead of deleting.
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

function ReplaceFileControl({
  assetId,
  onReplaced,
  isVideo,
}: {
  assetId: string;
  onReplaced: () => void;
  isVideo: boolean;
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
          <input
            ref={inputRef}
            type="file"
            accept={isVideo ? "video/*" : "image/*"}
            onChange={handleFile}
            className="hidden"
            disabled={uploading}
          />
          Choose New File
        </label>
      )}
      {status === "success" && <p className="text-[10px] text-emerald-400">{message}</p>}
      {status === "error" && <p className="text-[10px] text-red-400">{message}</p>}
    </div>
  );
}
