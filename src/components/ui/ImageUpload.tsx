"use client";

import { useState, useRef, ChangeEvent } from "react";
import { motion } from "framer-motion";
import { StorageService } from "@/services/storage.service";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  onDelete?: (url: string) => Promise<void>;
  currentImage?: string | null;
  folder?: string;
  label?: string;
  showDelete?: boolean;
}

export function ImageUpload({
  onUpload,
  onDelete,
  currentImage,
  folder = "general",
  label = "Upload Image",
  showDelete = true,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("🖼️ ImageUpload handleFileChange — file:", file.name, "size:", file.size, "type:", file.type);

    if (file.size > 5 * 1024 * 1024) {
      console.log("🖼️ ImageUpload — file too large:", file.size);
      setError("File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      console.log("🖼️ ImageUpload — invalid file type:", file.type);
      setError("Only image files are allowed");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await StorageService.upload(file, folder);
      console.log("🖼️ ImageUpload upload success — calling onUpload with:", result.publicUrl);
      setPreview(result.publicUrl);
      onUpload(result.publicUrl);
    } catch (err) {
      console.error("🖼️ ImageUpload upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!preview) return;

    console.log("🖼️ ImageUpload handleDelete — preview:", preview);

    if (onDelete) {
      await onDelete(preview);
    }

    setPreview(null);
    onUpload("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    console.log("🖼️ ImageUpload handleDelete done");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    console.log("🖼️ ImageUpload handleDrop — file:", file?.name);
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center
          rounded-lg border-2 border-dashed border-gray-300 transition-colors
          hover:border-s8ul-cyan hover:bg-s8ul-cyan/5
          ${isUploading ? "opacity-50" : ""}
        `}
      >
        {preview ? (
          <div className="relative w-full">
            <img
              src={preview}
              alt="Upload preview"
              className="h-auto max-h-48 w-full rounded-lg object-cover"
            />
            {showDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-lg hover:bg-red-600"
                title="Delete image"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">{isUploading ? "Uploading..." : "Click or drag & drop to upload"}</p>
            <p className="text-xs text-gray-400">PNG, JPG, WebP up to 5MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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
