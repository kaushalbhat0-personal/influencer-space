/**
 * Strict absolute http/https URL validator — RCCF-PRELAUNCH-03D.
 *
 * Accepts ONLY a standalone absolute http/https URL.
 * Rejects:
 * - empty, >2048 chars, leading/trailing whitespace
 * - whitespace anywhere (space, \n, \r, \t, etc.)
 * - control characters (\x00-\x1F, \x7F)
 * - relative URLs, ftp/file/javascript/data, mailto etc.
 * - URL + appended prose / newline / closing punctuation + prose
 * Controlled via a single source of truth — do not duplicate.
 */

export const MAX_URL_LENGTH = 2048;

export function isValidHttpUrl(value: string): boolean {
  if (typeof value !== "string") return false;
  if (value.length === 0 || value.length > MAX_URL_LENGTH) return false;
  // Reject leading/trailing whitespace — standalone URL must be exact.
  if (value !== value.trim()) return false;
  // Reject whitespace anywhere (covers \n, \r, \t, space, etc.)
  if (/\s/.test(value)) return false;
  // Reject control characters (including \x00-\x1F not covered by \s in some engines)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(value)) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
