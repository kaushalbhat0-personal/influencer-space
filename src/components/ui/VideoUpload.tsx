"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";

interface VideoUploadProps {
  onChange: (file: File | null, previewUrl: string) => void;
  onDelete?: (url: string) => Promise<void>;
  currentUrl?: string | null;
  label?: string;
}

export function VideoUpload({
  onChange,
  onDelete,
  currentUrl,
  label = "Upload Video",
}: VideoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentUrl && !preview) {
      setPreview(currentUrl);
    }
  }, [currentUrl, preview]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError("Video size must be less than 50MB");
      return;
    }

    if (!file.type.startsWith("video/")) {
      setError("Only video files are allowed");
      return;
    }

    setError(null);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setPreview(previewUrl);
    onChange(file, previewUrl);
  };

  const handleRemove = async () => {
    const urlToDelete = currentUrl || preview;
    if (urlToDelete && onDelete) {
      await onDelete(urlToDelete);
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setPreview(null);
    onChange(null, "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div
        className="relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:border-s8ul-cyan hover:bg-s8ul-cyan/5"
        onClick={() => fileInputRef.current?.click()}
      >
        {(preview || currentUrl) ? (
          <div className="relative w-full">
            <video
              src={preview || currentUrl || ""}
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
            <p className="mt-2 text-sm text-gray-500">Click to upload video</p>
            <p className="text-xs text-gray-400">MP4, WebM up to 50MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
