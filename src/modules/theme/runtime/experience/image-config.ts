/**
 * RCCF-71.6.4 — Background Image configuration helpers (pure, dependency-free).
 *
 * Shared by the server action (theme.actions) and the override resolver so the
 * Builder and the storefront agree on what a background image may be. No
 * runtime, no plan logic, no storage — just safe validation + normalization.
 */

/** themeConfig stores the image opacity as a percentage string (5..90). */
export const IMAGE_OPACITY_MIN = 5;
export const IMAGE_OPACITY_MAX = 90;
export const IMAGE_OPACITY_DEFAULT = 35;

/**
 * Only same-origin asset URLs (public uploads, `/uploads/...`) or https(s)
 * image sources are accepted. Anything else (javascript:, data:, blob:, control
 * chars) is rejected so no unsafe scheme ever reaches the runtime.
 */
export function isSafeAssetUrl(value: string | undefined | null): boolean {
  if (!value || value.length > 2048) return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (/^\/(?!\/)/.test(value)) return true;
  return false;
}

/** Validates a themeConfig opacity percentage string (5..90). */
export function isValidImageOpacity(value: string | undefined | null): boolean {
  if (!value) return false;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= IMAGE_OPACITY_MIN && parsed <= IMAGE_OPACITY_MAX;
}

/** Parses a themeConfig percentage string to a 0..1 runtime opacity; safe default. */
export function parseImageOpacity(raw?: string | null): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(IMAGE_OPACITY_MAX / 100, Math.max(IMAGE_OPACITY_MIN / 100, parsed / 100));
}