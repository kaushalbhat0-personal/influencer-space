"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { uploadAsset } from "@/actions/media.actions";

export interface MediaUploadFieldProps {
  label: string;
  currentUrl?: string | null;
  accept?: string;
  folder?: string;
  entityType?: string;
  entityId?: string;
  entityField?: string;
  onUploadComplete: (result: { assetId: string; url: string }) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function MediaUploadField({
  label,
  currentUrl,
  accept = "image/*",
  folder = "general",
  entityType,
  entityId,
  entityField,
  onUploadComplete,
  onError,
  className = "",
}: MediaUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("folder", folder);
    if (entityType) formData.set("entityType", entityType);
    if (entityId) formData.set("entityId", entityId);
    if (entityField) formData.set("entityField", entityField);

    try {
      const result = await uploadAsset(formData);
      if (result.success && result.assetId && result.url) {
        setPreview(result.url);
        onUploadComplete({ assetId: result.assetId, url: result.url });
      } else {
        const msg = result.error ?? "Upload failed";
        setError(msg);
        onError?.(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      onError?.(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-medium text-zinc-400">{label}</label>
      <div className="flex items-center gap-3">
        {preview && (
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-white/10">
            <img src={preview} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 hover:border-white/20 hover:text-zinc-300 transition-colors">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelected}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? "Uploading..." : preview ? "Replace" : "Upload"}
        </label>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
