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

export interface SignedUploadUrl {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
}

export interface StorageProvider {
  readonly name: string;
  upload(storageKey: string, input: UploadInput): Promise<UploadResult>;
  delete(storageKey: string): Promise<void>;
  getPublicUrl(storageKey: string): Promise<string>;
  list(prefix: string): Promise<string[]>;
  exists(storageKey: string): Promise<boolean>;
  /** Whether this provider supports direct (signed-URL) uploads that bypass the
   *  app server's request-body limit. Defaults to false. */
  readonly supportsSignedUpload?: boolean;
  /** Generate a signed URL the CLIENT can PUT a file to directly (no body
   *  through the app server). Throws if unsupported. */
  createSignedUploadUrl?(storageKey: string): Promise<SignedUploadUrl>;
}
