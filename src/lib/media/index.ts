// ── Storage Providers ─────────────────────────────────────
export type { StorageProvider, UploadInput } from "./providers/interface";
export type { UploadResult as ProviderUploadResult } from "./providers/interface";
export { LocalStorageProvider } from "./providers/local";
export { SupabaseStorageProvider } from "./providers/supabase";
export { StorageProviderFactory, storageProviderFactory } from "./providers/factory";

// ── Asset Repository ──────────────────────────────────────
export { AssetRepository, assetRepository } from "./repositories/asset-repository";
export type { AssetFilters } from "./repositories/asset-queries";
export type { CreateAssetData, UpdateAssetData } from "./repositories/asset-commands";

// ── Media Service ─────────────────────────────────────────
export { MediaService, mediaService, MediaValidationError, MediaReferenceError } from "./service";
export type { UploadOptions, UploadResult, ReplaceOptions } from "./service";

// ── Validator ─────────────────────────────────────────────
export { MediaValidator, mediaValidator, categorizeMime } from "./validator";
export type { ValidationResult, FileInfo, MediaCategory } from "./validator";

// ── Legacy (deprecated — will be replaced by AssetRepository) ──
export { AssetRegistry, assetRegistry } from "./registry";
export { AssetResolver, assetResolver } from "./resolver";
export type { VariantName, ViewportSize } from "./resolver";
