"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { uploadAsset } from "@/actions/media.actions";
import { removeAssetReference } from "@/actions/media-library.actions";
import { MediaPickerDialog } from "./MediaPickerDialog";
import type { MediaValue } from "./MediaField";

interface MediaFieldMultiProps {
  label: string;
  value: MediaValue[];
  accept?: string;
  folder?: string;
  entityType?: string;
  entityId?: string;
  entityField?: string;
  onChange: (value: MediaValue[]) => void;
  onError?: (error: string) => void;
  max?: number;
  className?: string;
}

export function MediaFieldMulti({
  label,
  value,
  accept = "image/*",
  folder = "general",
  entityType,
  entityId,
  entityField,
  onChange,
  onError,
  max,
  className = "",
}: MediaFieldMultiProps) {
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAdd = !max || value.length < max;

  function fail(message: string) {
    setError(message);
    onError?.(message);
  }

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    setError(null);
    const added: MediaValue[] = [];
    const list = Array.from(files);

    for (const file of list) {
      if (max && value.length + added.length >= max) break;
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", folder);
      if (entityType) formData.set("entityType", entityType);
      if (entityId) formData.set("entityId", entityId);
      if (entityField) formData.set("entityField", entityField);

      const result = await uploadAsset(formData);
      if (result.success && result.assetId && result.url) {
        added.push({ assetId: result.assetId, url: result.url });
      }
    }

    setUploading(false);
    if (added.length > 0) {
      onChange([...value, ...added]);
    }
    if (added.length < list.length) {
      fail("Some files could not be uploaded");
    }
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      await uploadFiles(files);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    const removed = value[index];
    if (removed?.assetId && entityType && entityId) {
      removeAssetReference(removed.assetId, entityType, entityId, entityField).catch(() => {});
    }
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-medium text-zinc-400">{label}</label>

      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {value.map((item, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
              {item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-zinc-800">
                  <span className="text-[10px] text-zinc-600">No preview</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove image ${i + 1}`}
                className="absolute right-1 top-1 rounded bg-black/70 p-1 text-[10px] text-red-400 opacity-0 transition-opacity hover:bg-black group-hover:opacity-100"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {canAdd ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple
              onChange={handleFiles}
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
      ) : (
        max && value.length >= max && (
          <p className="text-[10px] text-zinc-600">Maximum {max} items reached.</p>
        )
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <MediaPickerDialog
        open={pickerOpen}
        accept={accept}
        folder={folder}
        onClose={() => setPickerOpen(false)}
        onSelect={(media) => {
          if (max && value.length >= max) return;
          onChange([...value, { assetId: media.assetId, url: media.url }]);
          setPickerOpen(false);
          setError(null);
        }}
      />
    </div>
  );
}
