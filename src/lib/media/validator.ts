export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileInfo {
  filename: string;
  mimeType: string;
  size: number;
  buffer?: Buffer;
}

const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
];

const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
];

const ALLOWED_DOCUMENT_MIMES = [
  "application/pdf",
  "text/plain",
  "text/csv",
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_FOLDERS = [
  "profile",
  "gallery",
  "hero",
  "products",
  "timeline",
  "milestones",
  "games",
  "feed",
  "library",
  "general",
];

export type MediaCategory = "image" | "video" | "document";

export function categorizeMime(mimeType: string): MediaCategory {
  if (ALLOWED_IMAGE_MIMES.includes(mimeType)) return "image";
  if (ALLOWED_VIDEO_MIMES.includes(mimeType)) return "video";
  if (ALLOWED_DOCUMENT_MIMES.includes(mimeType)) return "document";
  return "document";
}

export class MediaValidator {
  validateUpload(file: FileInfo, folder?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const mimeError = this.validateMime(file.mimeType);
    if (mimeError) errors.push(mimeError);

    const sizeError = this.validateSize(file.mimeType, file.size);
    if (sizeError) errors.push(sizeError);

    if (folder) {
      const folderError = this.validateFolder(folder);
      if (folderError) errors.push(folderError);
    }

    const nameResult = this.sanitizeFilename(file.filename);
    if (nameResult.warning) warnings.push(nameResult.warning);

    return { valid: errors.length === 0, errors, warnings };
  }

  validateReplacement(assetMimeType: string, newFile: FileInfo): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (assetMimeType !== newFile.mimeType && !this.isCompatibleMime(assetMimeType, newFile.mimeType)) {
      warnings.push(`Replacing ${assetMimeType} with ${newFile.mimeType} may cause issues`);
    }

    const sizeError = this.validateSize(newFile.mimeType, newFile.size);
    if (sizeError) errors.push(sizeError);

    return { valid: errors.length === 0, errors, warnings };
  }

  validateMime(mimeType: string): string | null {
    const allAllowed = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES, ...ALLOWED_DOCUMENT_MIMES];
    if (!allAllowed.includes(mimeType)) {
      return `Unsupported MIME type: ${mimeType}. Allowed: ${allAllowed.join(", ")}`;
    }
    return null;
  }

  validateSize(mimeType: string, size: number): string | null {
    const category = categorizeMime(mimeType);
    const maxSize = category === "image" ? MAX_IMAGE_SIZE
      : category === "video" ? MAX_VIDEO_SIZE
      : MAX_DOCUMENT_SIZE;

    if (size > maxSize) {
      return `File too large: ${(size / 1024 / 1024).toFixed(1)} MB. Maximum: ${(maxSize / 1024 / 1024).toFixed(0)} MB`;
    }

    if (size === 0) {
      return "File is empty";
    }

    return null;
  }

  validateFolder(folder: string): string | null {
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return `Invalid folder: ${folder}. Allowed: ${ALLOWED_FOLDERS.join(", ")}`;
    }
    return null;
  }

  sanitizeFilename(filename: string): { sanitized: string; warning: string | null } {
    const hasPath = filename.includes("/") || filename.includes("\\");
    const hasSpecial = /[<>:"|?*]/.test(filename);

    if (hasPath || hasSpecial) {
      const sanitized = filename.replace(/[/\\<>:"|?*]/g, "-");
      return { sanitized, warning: "Filename contained special characters and was sanitized" };
    }

    return { sanitized: filename, warning: null };
  }

  private isCompatibleMime(a: string, b: string): boolean {
    return a.split("/")[0] === b.split("/")[0];
  }

  get allowedImageMimes(): string[] {
    return [...ALLOWED_IMAGE_MIMES];
  }

  get allowedVideoMimes(): string[] {
    return [...ALLOWED_VIDEO_MIMES];
  }

  get allowedFolders(): string[] {
    return [...ALLOWED_FOLDERS];
  }
}

export const mediaValidator = new MediaValidator();
