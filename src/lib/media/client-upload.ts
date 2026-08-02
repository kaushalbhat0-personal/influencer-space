"use client";

export interface ClientUploadOptions {
  file: File;
  folder?: string;
  entityType?: string;
  entityId?: string;
  entityField?: string;
  altText?: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export interface ClientUploadResult {
  success: boolean;
  assetId?: string;
  url?: string;
  deduplicated?: boolean;
  error?: string;
}

/**
 * Upload a file with real progress reporting (XHR exposes upload progress;
 * server actions / fetch do not). Used by MediaField, MediaFieldMulti,
 * ImageManager and the Media Library so every upload path shows progress.
 */
export function uploadFileWithProgress(options: ClientUploadOptions): Promise<ClientUploadResult> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.set("file", options.file);
    formData.set("folder", options.folder ?? "general");
    if (options.entityType) formData.set("entityType", options.entityType);
    if (options.entityId) formData.set("entityId", options.entityId);
    if (options.entityField) formData.set("entityField", options.entityField);
    if (options.altText) formData.set("altText", options.altText);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && options.onProgress) {
        options.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as ClientUploadResult;
        resolve(data);
      } catch {
        resolve({ success: false, error: "Invalid server response" });
      }
    };
    xhr.onerror = () => resolve({ success: false, error: "Network error during upload" });
    xhr.onabort = () => resolve({ success: false, error: "Upload cancelled" });
    if (options.signal) {
      options.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(formData);
  });
}
