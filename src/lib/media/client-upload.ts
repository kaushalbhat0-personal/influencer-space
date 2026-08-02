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
 *
 * The endpoint MUST return `application/json` for every response (success and
 * failure). If the server returns anything else (an HTML error page, a dev
 * overlay, a server-action redirect), this resolves a structured error that
 * names the HTTP status + content type instead of a misleading generic message.
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
    xhr.responseType = "text";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && options.onProgress) {
        options.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      const status = xhr.status;
      const contentType = (xhr.getResponseHeader("content-type") ?? "").toLowerCase();
      const text = xhr.responseText ?? "";

      // Normalize a "successful" transport into a decoded payload.
      if (contentType.includes("application/json") && text.trim().length > 0) {
        try {
          const data = JSON.parse(text) as ClientUploadResult;
          resolve(data);
        } catch {
          resolve({
            success: false,
            error: `Upload failed: server returned invalid JSON (HTTP ${status})`,
          });
        }
        return;
      }

      // The endpoint must never serve non-JSON. Detect the misbehaving layer
      // so it is reported instead of masked.
      if (contentType.includes("text/html")) {
        resolve({
          success: false,
          error: `Upload endpoint returned an HTML page (HTTP ${status}). The endpoint contract was broken — upload could not complete.`,
        });
        return;
      }

      if (text.trim().length > 0) {
        resolve({
          success: false,
          error: `Upload failed: unexpected response type ${contentType || "unknown"} (HTTP ${status})`,
        });
        return;
      }

      resolve({ success: false, error: `Upload failed: empty response (HTTP ${status})` });
    };
    xhr.onerror = () => resolve({ success: false, error: "Network error during upload" });
    xhr.onabort = () => resolve({ success: false, error: "Upload cancelled" });
    if (options.signal) {
      options.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(formData);
  });
}
