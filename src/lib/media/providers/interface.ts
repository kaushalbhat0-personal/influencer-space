export interface UploadInput {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export interface UploadResult {
  storageKey: string;
  publicUrl: string;
  size: number;
}

export interface StorageProvider {
  readonly name: string;
  upload(storageKey: string, input: UploadInput): Promise<UploadResult>;
  delete(storageKey: string): Promise<void>;
  getPublicUrl(storageKey: string): Promise<string>;
  list(prefix: string): Promise<string[]>;
  exists(storageKey: string): Promise<boolean>;
}
