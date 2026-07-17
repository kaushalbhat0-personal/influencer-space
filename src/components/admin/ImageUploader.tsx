"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { supabaseClient, BUCKET } from "@/lib/supabase";

export interface ImageUploaderHandle {
  upload: () => Promise<string | null>;
  reset: () => void;
}

interface ImageUploaderProps {
  tenantId: string;
  folder: string;
  accept?: string;
  onFileSelect?: (file: File | null, previewUrl: string | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

async function uploadToSupabase(file: File, tenantId: string, folder: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const path = `${tenantId}/${folder}/${timestamp}-${random}.${ext}`;

  const { data, error } = await supabaseClient.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (error) throw new Error(error.message);

  const { data: urlData } = supabaseClient.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export const ImageUploader = forwardRef<ImageUploaderHandle, ImageUploaderProps>(
  function ImageUploader({ tenantId, folder, accept = "image/jpeg,image/png,image/webp,image/gif", onFileSelect, onUploadingChange }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
      return () => {
        if (preview) URL.revokeObjectURL(preview);
      };
    }, [preview]);

    useEffect(() => {
      onUploadingChange?.(isUploading);
    }, [isUploading, onUploadingChange]);

    useImperativeHandle(ref, () => ({
      upload: async () => {
        if (!file) return null;
        setIsUploading(true);
        try {
          const url = await uploadToSupabase(file, tenantId, folder);
          return url;
        } finally {
          setIsUploading(false);
        }
      },
      reset: () => {
        setFile(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        if (inputRef.current) inputRef.current.value = "";
        onFileSelect?.(null, null);
      },
    }));

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > 50 * 1024 * 1024) return;

      if (preview) URL.revokeObjectURL(preview);
      const blobUrl = URL.createObjectURL(f);
      setFile(f);
      setPreview(blobUrl);
      onFileSelect?.(f, blobUrl);
    }

    if (isUploading) {
      return (
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Uploading...
        </div>
      );
    }

    if (file && preview) {
      return (
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-2 text-sm">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-zinc-800">
            <img src={preview} alt="" className="h-full w-full object-cover" />
          </div>
          <span className="min-w-0 flex-1 truncate text-zinc-300">{file.name}</span>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              if (preview) URL.revokeObjectURL(preview);
              setPreview(null);
              if (inputRef.current) inputRef.current.value = "";
              onFileSelect?.(null, null);
            }}
            className="shrink-0 rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      );
    }

    return (
      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300"
      >
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Upload Image
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    );
  },
);
