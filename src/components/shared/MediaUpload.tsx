"use client";

import { useState, useRef } from "react";
import { Upload, X, FileVideo } from "lucide-react";
import { supabaseClient, BUCKET } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export interface MediaFile {
  file: File;
  preview: string;
  id: string;
}

interface MediaUploadProps {
  tenantId: string;
  folder: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  onUploadComplete: (urls: string[]) => void;
  onError?: (error: string) => void;
  className?: string;
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

export function MediaUpload({
  tenantId, folder, accept = "image/jpeg,image/png,image/webp,image/gif",
  multiple = false, maxFiles = 1, maxSizeMB = 50,
  onUploadComplete, onError, className,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} files allowed`);
      return;
    }
    for (const f of selected) {
      if (f.size > maxSizeMB * 1024 * 1024) {
        onError?.(`${f.name} exceeds ${maxSizeMB}MB limit`);
        return;
      }
    }
    const newFiles: MediaFile[] = selected.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const uploadAll = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of files) {
        const url = await uploadToSupabase(f.file, tenantId, folder);
        urls.push(url);
      }
      onUploadComplete(urls);
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (uploading) {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400", className)}>
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Uploading {files.length} file{files.length !== 1 ? "s" : ""}...
      </div>
    );
  }

  if (files.length > 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {files.map((f) => (
            <div key={f.id} className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-white/5">
              {f.file.type.startsWith("video/") ? (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                  <FileVideo className="h-8 w-8 text-zinc-600" />
                </div>
              ) : (
                <img src={f.preview} alt="" className="h-full w-full object-cover" />
              )}
              <button type="button" onClick={() => removeFile(f.id)}
                className="absolute top-1 right-1 rounded p-1 bg-black/60 text-zinc-300 hover:bg-red-500/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove file"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-zinc-400 truncate max-w-[90%]">
                {f.file.name}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {multiple && (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="admin-btn-outline text-xs px-3 py-1.5">
              Add More
            </button>
          )}
          <button type="button" onClick={uploadAll}
            className="admin-btn-cyan text-xs px-4 py-1.5">
            Upload {files.length} file{files.length !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-white/10 bg-zinc-900/50 px-4 py-6 text-sm text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300",
        className,
      )}
    >
      <Upload className="h-5 w-5 shrink-0" />
      <span>{multiple ? "Upload files" : "Upload image"}</span>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleSelect} className="hidden" />
    </div>
  );
}
