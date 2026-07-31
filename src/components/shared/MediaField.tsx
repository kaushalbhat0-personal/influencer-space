"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { uploadAsset } from "@/actions/media.actions";
import { removeAssetReference } from "@/actions/media-library.actions";
import { MediaPickerDialog, type PickedMedia } from "./MediaPickerDialog";

export interface MediaValue {
  assetId?: string | null;
  url?: string | null;
}

interface MediaFieldProps {
  label: string;
  value?: MediaValue | null;
  accept?: string;
  folder?: string;
  entityType?: string;
  entityId?: string;
  entityField?: string;
  onChange: (value: MediaValue | null) => void;
  onError?: (error: string) => void;
  className?: string;
  allowClear?: boolean;
}

function isVideoUrl(url: string | undefined | null, accept: string): boolean {
  if (accept.includes("video") && !accept.includes("image")) return true;
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url ?? "");
}

function dereference(value: MediaValue | null | undefined, entityType?: string, entityId?: string, entityField?: string) {
  if (value?.assetId && entityType && entityId) {
    removeAssetReference(value.assetId, entityType, entityId, entityField).catch(() => {});
  }
}

export function MediaField({
  label,
  value,
  accept = "image/*",
  folder = "general",
  entityType,
  entityId,
  entityField,
  onChange,
  onError,
  className = "",
  allowClear = true,
}: MediaFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  const url = value?.url ?? null;
  const isVideo = isVideoUrl(url, accept);

  function fail(message: string) {
    setError(message);
    onError?.(message);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    dereference(value, entityType, entityId, entityField);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("folder", folder);
    if (entityType) formData.set("entityType", entityType);
    if (entityId) formData.set("entityId", entityId);
    if (entityField) formData.set("entityField", entityField);

    const result = await uploadAsset(formData);
    if (result.success && result.assetId && result.url) {
      onChange({ assetId: result.assetId, url: result.url });
    } else {
      fail(result.error ?? "Upload failed");
    }
    setUploading(false);
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile(file);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      if (replaceRef.current) replaceRef.current.value = "";
    }
  }

  function handleSelect(media: PickedMedia) {
    if (!media.url) return fail("Selected media has no URL");
    dereference(value, entityType, entityId, entityField);
    onChange({ assetId: media.assetId, url: media.url });
    setPickerOpen(false);
    setError(null);
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-medium text-zinc-400">{label}</label>

      {url ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
            {isVideo ? (
              <video src={url} controls className="max-h-48 w-full object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="max-h-48 w-full object-contain" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300">
              <input
                ref={replaceRef}
                type="file"
                accept={accept}
                onChange={handleFile}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? "Uploading..." : "Replace"}
            </label>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={uploading}
              className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300"
            >
              Choose from Library
            </button>
            {allowClear && (
              <button
                type="button"
                onClick={() => { dereference(value, entityType, entityId, entityField); onChange(null); }}
                disabled={uploading}
                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300">
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFile}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? "Uploading..." : "Upload"}
            </label>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={uploading}
              className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300"
            >
              Choose from Library
            </button>
          </div>
          <p className="text-[10px] text-zinc-600">No media selected yet.</p>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <MediaPickerDialog
        open={pickerOpen}
        accept={accept}
        folder={folder}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
      />
    </div>
  );
}
