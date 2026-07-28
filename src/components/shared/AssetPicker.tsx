"use client";

import { useState, useEffect, useCallback } from "react";
import { CreatorImage } from "./CreatorImage";
import { listAssets } from "@/actions/media-library.actions";
import type { AssetFilters } from "@/lib/media/repositories/asset-queries";

export interface AssetPickerResult {
  assetId: string;
  url: string;
}

export interface AssetPickerProps {
  onSelect: (result: AssetPickerResult) => void;
  onClose?: () => void;
  selectedId?: string;
  filter?: AssetFilters;
}

export function AssetPicker({ onSelect, onClose, selectedId, filter }: AssetPickerProps) {
  const [assets, setAssets] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAssets({ ...filter, search: search || undefined, limit: 100 });
    if (result.success) {
      setAssets(result.assets as Array<Record<string, unknown>>);
    }
    setLoading(false);
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-auto max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Select Media</h2>
          {onClose && (
            <button onClick={onClose} className="text-zinc-500 hover:text-white text-sm">&times;</button>
          )}
        </div>
        <div className="border-b border-white/10 px-4 py-2">
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600"
          />
        </div>
        <div className="grid grid-cols-4 gap-3 overflow-y-auto p-4" style={{ maxHeight: "50vh" }}>
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-zinc-800" />
          ))}
          {!loading && assets.map((asset) => {
            const id = asset.id as string;
            const url = asset.publicUrl as string;
            const isSelected = id === selectedId;
            return (
              <button
                key={id}
                onClick={() => onSelect({ assetId: id, url: url ?? "" })}
                className={`group relative aspect-square overflow-hidden rounded-lg border transition-all ${
                  isSelected
                    ? "border-s8ul-cyan ring-2 ring-s8ul-cyan/50"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {url ? (
                  <CreatorImage src={url} alt="" variant="thumbnail" className="h-full w-full" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-zinc-800">
                    <span className="text-xs text-zinc-600">No preview</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="truncate text-[10px] text-white/80">{asset.originalFilename as string}</p>
                </div>
              </button>
            );
          })}
          {!loading && assets.length === 0 && (
            <div className="col-span-4 py-12 text-center">
              <p className="text-sm text-zinc-500">No assets found</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2">
          <span className="text-xs text-zinc-500">{assets.length} asset{assets.length !== 1 ? "s" : ""}</span>
          <div className="flex gap-2">
            <MediaUploadButton onSelect={onSelect} />
            {onClose && (
              <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaUploadButton({ onSelect }: { onSelect: (result: AssetPickerResult) => void }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("folder", "library");
    const { uploadAsset } = await import("@/actions/media.actions");
    const result = await uploadAsset(formData);
    if (result.success && result.assetId && result.url) {
      onSelect({ assetId: result.assetId, url: result.url });
    }
    setUploading(false);
  }

  return (
    <label className="cursor-pointer rounded-lg bg-s8ul-cyan px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition-opacity">
      {uploading ? "Uploading..." : "Upload New"}
      <input type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" disabled={uploading} />
    </label>
  );
}
