export interface UploadInput {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  folder?: string;
}

export interface UploadResult {
  storageKey: string;
  publicUrl: string;
  thumbnailUrl?: string;
  size: number;
  width?: number;
  height?: number;
}

export interface DeleteResult {
  success: boolean;
}

/**
 * Abstract storage provider.
 * Media Library depends only on this interface — never on a specific provider.
 */
export interface StorageProvider {
  readonly name: string;
  upload(input: UploadInput): Promise<UploadResult>;
  delete(storageKey: string): Promise<DeleteResult>;
  getPublicUrl(storageKey: string): string;
}
