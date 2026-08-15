// RCCF-65.2: affiliate links only ever open http(s) URLs. Non-web schemes are
// dropped at render time so the storefront never navigates to javascript:/
// data: URLs. Pure helper — no React imports (kept unit-testable in node env).
export function safeUrl(raw: string): string {
  const trimmed = (raw || "").trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : "";
}
