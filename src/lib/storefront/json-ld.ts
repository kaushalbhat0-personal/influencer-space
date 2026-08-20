/**
 * RCCF-72.17A (SEC-01) — safe JSON-LD serialization for the storefront.
 *
 * `JSON.stringify` does NOT escape `<`, so a creator-controlled string containing
 * `</script>` embedded in a `<script type="application/ld+json">` element would
 * terminate the script element and allow HTML/script injection on the platform
 * origin. Escaping the JSON metacharacters (per the XSSI/JSON-in-script cheat
 * sheet) neutralizes script-context breakout while keeping the output valid JSON
 * for `application/ld+json` consumers.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}