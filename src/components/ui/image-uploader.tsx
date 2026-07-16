"use client";

import { useRef, ChangeEvent, useMemo } from "react";
import { supabaseClient, BUCKET } from "@/lib/supabase";

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  isUploading: boolean;
  setIsUploading: (val: boolean) => void;
  accept?: string;
  tenantId: string;
  folder?: string;
}

export function ImageUploader({
  onUploadSuccess,
  isUploading,
  setIsUploading,
  accept = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime",
  tenantId,
  folder = "gallery",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const label = useMemo(() => {
    const a = accept.toLowerCase();
    if (a.includes("gif")) return "Upload Image or GIF";
    if (a.includes("video")) return "Upload Video File (Max 50MB)";
    return "Upload Image";
  }, [accept]);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) return;

    setIsUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const path = `${tenantId}/${folder}/${timestamp}-${random}.${ext}`;

      const { data, error: uploadError } = await supabaseClient.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabaseClient.storage
        .from(BUCKET)
        .getPublicUrl(data.path);

      onUploadSuccess(urlData.publicUrl);
    } catch {
      // upload failed — UI shows the spinner stopping, managers handle errors via toast
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300"
    >
      {isUploading ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Uploading...
        </span>
      ) : (
        <>
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
}
