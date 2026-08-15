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
  /** Bulk storage removal (no N+1). Returns the keys that failed to remove. */
  deleteMany?(storageKeys: string[]): Promise<{ removed: number; failed: string[] }>;
  getPublicUrl(storageKey: string): Promise<string>;
  list(prefix: string): Promise<string[]>;
  exists(storageKey: string): Promise<boolean>;
  /**
   * RCCF-19 P1-S: authoritative object metadata (actual stored byte size).
   * Used at signed-upload completion so quota/limits are enforced against the
   * provider-reported size, never the client-declared one. Throws when the
   * object is missing or metadata cannot be retrieved (fail closed).
   */
  getObjectMetadata?(storageKey: string): Promise<{ size: number; mimeType?: string }>;
  /** RCCF-59 — read up to `maxBytes` of an object for server-side validation
   *  (e.g. hero-video duration parsing). Optional; enforcement degrades to a
   *  clear rejection when unavailable for a validation-required folder. */
  readRange?(storageKey: string, maxBytes: number): Promise<Buffer>;
  /** Whether this provider supports direct (signed-URL) uploads that bypass the
   *  app server's request-body limit. Defaults to false. */
  readonly supportsSignedUpload?: boolean;
  /** Generate a signed URL the CLIENT can PUT a file to directly (no body
   *  through the app server). Throws if unsupported. */
  createSignedUploadUrl?(storageKey: string): Promise<SignedUploadUrl>;
}
