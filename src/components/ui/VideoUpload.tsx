"use client";

import { useState, useRef, ChangeEvent } from "react";
import { motion } from "framer-motion";
import { uploadFile } from "@/actions/upload.actions";

interface VideoUploadProps {
  onUpload: (url: string) => void;
  onDelete?: (url: string) => Promise<void>;
  currentVideo?: string | null;
  folder?: string;
  label?: string;
}

export function VideoUpload({
  onUpload,
  onDelete,
  currentVideo,
  folder = "hero",
  label = "Upload Video",
}: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentVideo || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("🎬 VideoUpload handleFileChange — file:", file.name, "size:", file.size, "type:", file.type);

    if (file.size > 50 * 1024 * 1024) {
      setError("Video size must be less than 50MB");
      return;
    }

    if (!file.type.startsWith("video/")) {
      setError("Only video files are allowed");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const result = await uploadFile(formData);
      if (result.success) {
        const url = result.publicUrl;
        console.log("🎬 VideoUpload upload success — url:", url);
        setPreview(url);
        onUpload(url);
      } else {
        console.error("🎬 VideoUpload upload failed:", result.error);
        setError(result.error || "Upload failed");
      }
    } catch (err) {
      console.error("🎬 VideoUpload upload exception:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    console.log("🎬 VideoUpload handleRemove — preview:", preview);
    if (preview && onDelete) {
      await onDelete(preview);
    }
    setPreview(null);
    onUpload("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div
        className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:border-s8ul-cyan hover:bg-s8ul-cyan/5 ${isUploading ? "opacity-50" : ""}`}
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <div className="relative w-full">
            <video
              src={preview}
              className="h-auto max-h-48 w-full rounded-lg object-cover"
              controls
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-lg hover:bg-red-600"
              title="Delete video"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="p-4 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">{isUploading ? "Uploading..." : "Click to upload video"}</p>
            <p className="text-xs text-gray-400">MP4, WebM up to 50MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {isUploading && (
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
            <motion.div
              className="h-full bg-s8ul-cyan"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>
          <span className="text-xs text-gray-500">Uploading...</span>
        </div>
      )}
    </div>
  );
}
