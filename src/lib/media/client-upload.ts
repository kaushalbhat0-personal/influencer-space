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

interface SignedPayload {
  success: boolean;
  deduplicated?: boolean;
  assetId?: string;
  url?: string;
  storageKey?: string;
  signed?: { uploadUrl: string; storageKey: string; publicUrl: string } | null;
  error?: string;
}

interface RegisterPayload {
  success: boolean;
  assetId?: string;
  url?: string;
  error?: string;
}

/**
 * Upload a file with real progress reporting.
 *
 * Two-step DIRECT-to-storage upload (IMPLEMENTATION-20 Phase A): the file body
 * never travels through the app server, so Vercel's request-body limit (HTTP
 * 413 for large videos) can never be hit.
 *
 *   1. POST /api/media/upload-url  → signed upload URL (or dedup / fallback)
 *   2. PUT file body DIRECTLY to the signed URL (progress) — bypasses Vercel
 *   3. POST /api/media/register    → Asset row + reference
 *
 * Falls back to the multipart POST /api/media/upload when the provider does
 * not support signed uploads.
 */
export async function uploadFileWithProgress(options: ClientUploadOptions): Promise<ClientUploadResult> {
  // Validate video magic bytes locally (the server never sees the buffer for
  // signed uploads, so a fake "video" is rejected here).
  const magicError = await validateMagicBytes(options.file);
  if (magicError) return { success: false, error: magicError };

  // RCCF-59 — hero video client-side pre-checks (UX only; the server remains
  // the authority). Kept client-side because the server never sees the buffer
  // on the signed path until registration. RCCF-70.5.3 — the hero folder also
  // holds poster/background images, so these checks only apply to videos.
  if (options.folder === "hero" && options.file.type.startsWith("video/")) {
    if (options.file.type !== "video/mp4" && options.file.type !== "video/quicktime") {
      return { success: false, error: "Unsupported hero video format. MP4 is required for hero videos." };
    }
    if (options.file.size > 12 * 1024 * 1024) {
      return { success: false, error: `Hero video too large: ${(options.file.size / 1024 / 1024).toFixed(1)} MB. Maximum: 12 MB.` };
    }
    const heroMeta = await readMediaMetadata(options.file);
    if (heroMeta.duration && heroMeta.duration > 15) {
      return { success: false, error: `Hero video too long: ${heroMeta.duration} seconds. Maximum: 15 seconds.` };
    }
  }

  try {
    const checksum = await computeSha256(options.file);

    const prepare = (await postJSON("/api/media/upload-url", {
      filename: options.file.name,
      mimeType: options.file.type,
      size: options.file.size,
      checksum,
      folder: options.folder ?? "general",
      entityType: options.entityType,
      entityId: options.entityId,
      entityField: options.entityField,
      altText: options.altText,
    })) as SignedPayload;

    if (!prepare.success) return { success: false, error: prepare.error ?? "Failed to prepare upload" };

    // Deduplicated — reuse the existing asset.
    if (prepare.deduplicated && prepare.assetId && prepare.url) {
      options.onProgress?.(100);
      return { success: true, assetId: prepare.assetId, url: prepare.url, deduplicated: true };
    }

    // No signed-upload support → fall back to the multipart route.
    if (!prepare.signed) {
      return multipartFallback(options);
    }

    const uploaded = await putToSignedUrl(prepare.signed.uploadUrl, options.file, options.onProgress, options.signal);
    if (!uploaded.ok) {
      return { success: false, error: `Upload to storage failed (HTTP ${uploaded.status})` };
    }

    const meta = await readMediaMetadata(options.file);
    const register = (await postJSON("/api/media/register", {
      storageKey: prepare.signed.storageKey,
      publicUrl: prepare.signed.publicUrl,
      filename: options.file.name,
      mimeType: options.file.type,
      size: options.file.size,
      checksum,
      folder: options.folder ?? "general",
      entityType: options.entityType,
      entityId: options.entityId,
      entityField: options.entityField,
      altText: options.altText,
      width: meta.width,
      height: meta.height,
      duration: meta.duration,
    })) as RegisterPayload;

    if (!register.success || !register.assetId || !register.url) {
      return { success: false, error: register.error ?? "Failed to register upload" };
    }
    options.onProgress?.(100);
    return { success: true, assetId: register.assetId, url: register.url, deduplicated: false };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Upload failed" };
  }
}

function postJSON(url: string, body: Record<string, unknown>): Promise<unknown> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  }).then(async (res) => {
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("application/json")) {
      throw new Error(`Endpoint returned ${ct || "unknown"} (HTTP ${res.status})`);
    }
    return res.json();
  });
}

interface PutResult { ok: boolean; status: number }

function putToSignedUrl(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<PutResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
    xhr.onerror = () => resolve({ ok: false, status: 0 });
    xhr.onabort = () => resolve({ ok: false, status: 0 });
    if (signal) signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

async function multipartFallback(options: ClientUploadOptions): Promise<ClientUploadResult> {
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
      if (e.lengthComputable && options.onProgress) options.onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const status = xhr.status;
      const contentType = (xhr.getResponseHeader("content-type") ?? "").toLowerCase();
      const text = xhr.responseText ?? "";
      if (contentType.includes("application/json") && text.trim()) {
        try {
          resolve(JSON.parse(text) as ClientUploadResult);
          return;
        } catch {
          /* fall through */
        }
      }
      resolve({ success: false, error: `Upload failed: ${contentType || "unknown"} (HTTP ${status})` });
    };
    xhr.onerror = () => resolve({ success: false, error: "Network error during upload" });
    xhr.onabort = () => resolve({ success: false, error: "Upload cancelled" });
    if (options.signal) options.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(formData);
  });
}

async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function validateMagicBytes(file: File): Promise<string | null> {
  const mime = file.type;
  if (mime !== "video/mp4" && mime !== "video/webm" && mime !== "video/ogg" && mime !== "video/quicktime") {
    return null; // images / documents: no magic check
  }
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (head.length < 4) return "File is too small to be a video";
  if (mime === "video/mp4" || mime === "video/quicktime") {
    const hasFtyp = head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
    if (!hasFtyp) return "File does not look like a valid MP4 video";
  } else if (mime === "video/webm") {
    const hasEbml = head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
    if (!hasEbml) return "File does not look like a valid WebM video";
  } else if (mime === "video/ogg") {
    const hasOgg = head[0] === 0x4f && head[1] === 0x67 && head[2] === 0x67 && head[3] === 0x53;
    if (!hasOgg) return "File does not look like a valid Ogg video";
  }
  return null;
}

async function readMediaMetadata(
  file: File,
): Promise<{ width?: number; height?: number; duration?: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("video/")) {
      return await new Promise((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.muted = true;
        v.onloadedmetadata = () => {
          resolve({ width: v.videoWidth || undefined, height: v.videoHeight || undefined, duration: v.duration && isFinite(v.duration) ? Math.round(v.duration) : undefined });
          URL.revokeObjectURL(url);
        };
        v.onerror = () => { URL.revokeObjectURL(url); resolve({}); };
        v.src = url;
      });
    }
    if (file.type.startsWith("image/")) {
      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth || undefined, height: img.naturalHeight || undefined });
          URL.revokeObjectURL(url);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve({}); };
        img.src = url;
      });
    }
    return {};
  } catch {
    return {};
  }
}
