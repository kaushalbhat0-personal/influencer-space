/**
 * Runtime Trace — IMPLEMENTATION-16.
 *
 * THE single instrumentation point for every runtime. There is exactly ONE
 * rendering pipeline:
 *
 *   Database → websiteAggregate.build() → Draft/Published Layout
 *     → LayoutEngine.resolve() → Resolved Sections → ComponentRenderer → DOM
 *
 * Every runtime (Builder, Preview, Publish, Storefront, Production) calls
 * `traceRuntime()` with a uniform payload. The tracer computes aggregate
 * counts, resolved/visible/hidden sections, rendered components, the Runtime
 * Signature (SHA-256 of theme + layout + aggregate hash) and render timings,
 * then prints the SAME standard block everywhere. No duplicated tracing.
 */

import type { LayoutSnapshot, ThemeSnapshot, WebsiteAggregate } from "@/types/snapshot";

export type RuntimeType = "builder" | "preview" | "publish" | "storefront" | "production";

export interface RuntimeTraceCounts {
  hero: number;
  products: number;
  services: number;
  courses: number;
  gallery: number;
  faq: number;
  testimonials: number;
  timeline: number;
  games: number;
  contentFeed: number;
  links: number;
}

export function aggregateCounts(content: {
  hero?: { title?: string | null };
  products?: unknown[];
  services?: unknown[];
  courses?: unknown[];
  gallery?: unknown[];
  faq?: unknown[];
  testimonials?: unknown[];
  timeline?: unknown[];
  games?: unknown[];
  contentFeed?: unknown[];
  links?: unknown[];
}): RuntimeTraceCounts {
  return {
    hero: content?.hero?.title ? 1 : 0,
    products: content?.products?.length ?? 0,
    services: content?.services?.length ?? 0,
    courses: content?.courses?.length ?? 0,
    gallery: content?.gallery?.length ?? 0,
    faq: content?.faq?.length ?? 0,
    testimonials: content?.testimonials?.length ?? 0,
    timeline: content?.timeline?.length ?? 0,
    games: content?.games?.length ?? 0,
    contentFeed: content?.contentFeed?.length ?? 0,
    links: content?.links?.length ?? 0,
  };
}

export interface RuntimeSection {
  id: string;
  moduleId: string;
  visible: boolean;
}

export interface RuntimeSections {
  all: RuntimeSection[];
  visible: RuntimeSection[];
  hidden: RuntimeSection[];
  components: string[];
}

/** Flatten a LayoutSnapshot into section descriptors (same rule everywhere). */
export function runtimeSections(layout: LayoutSnapshot): RuntimeSections {
  const all: RuntimeSection[] = layout.pages.flatMap((p) =>
    p.sections.map((s) => ({
      id: s.id,
      moduleId: s.moduleId,
      visible: s.visible !== false,
    })),
  );
  const visible = all.filter((s) => s.visible);
  return {
    all,
    visible,
    hidden: all.filter((s) => !s.visible),
    components: visible.map((s) => s.moduleId),
  };
}

// ── SHA-256 (pure, synchronous, portable) ────────────────────────────────
// Same implementation on server (Node) and client (browser) so the Runtime
// Signature is byte-for-byte identical across all runtimes.

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function sha256Hex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const bitLen = bytes.length * 8;
  const paddedLen = (((bytes.length + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let i = 0; i < paddedLen; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[j] + w[j]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((x) => x.toString(16).padStart(8, "0")).join("");
}

/** Deterministic JSON — object keys sorted so hashing is order-independent. */
export function canonicalStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(record[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Runtime Signature — IMPLEMENTATION-16.
 * SHA-256(theme + layout snapshot + sha256(aggregate)).
 * Identical for Builder, Preview, Publish, Storefront and Production whenever
 * they render the same theme + layout + live content.
 */
export function computeRuntimeSignature(input: {
  theme: ThemeSnapshot;
  layout: LayoutSnapshot;
  aggregate: WebsiteAggregate;
}): string {
  const themeStr = canonicalStringify(input.theme);
  const layoutStr = canonicalStringify(input.layout);
  const aggregateHash = sha256Hex(canonicalStringify(input.aggregate));
  return sha256Hex(themeStr + layoutStr + aggregateHash);
}

export interface RuntimeTimings {
  aggregateMs?: number;
  resolveMs?: number;
  totalMs?: number;
}

/** Data-resolution diagnostics collected while building the aggregate. */
export interface AggregateTraceDiagnostics {
  invalidAssetIds: Array<{ id: string; module: string; field?: string }>;
  skippedAssets: number;
  moduleFailures: string[];
}

export interface RuntimeTraceInput {
  runtimeType: RuntimeType;
  creator: string;
  theme: ThemeSnapshot;
  layout: LayoutSnapshot;
  aggregate: WebsiteAggregate;
  websiteId?: string;
  tenantId?: string;
  slug?: string | null;
  correlationId?: string | null;
  storeVersion?: number;
  timings?: RuntimeTimings;
  diagnostics?: AggregateTraceDiagnostics;
}

/** The ONLY runtime tracer. Every runtime calls this with a uniform payload. */
export function traceRuntime(input: RuntimeTraceInput): string {
  if (typeof console === "undefined") return "";

  const counts = aggregateCounts(input.aggregate);
  const sections = runtimeSections(input.layout);
  const signature = computeRuntimeSignature({
    theme: input.theme,
    layout: input.layout,
    aggregate: input.aggregate,
  });
  const timings = input.timings ?? {};
  const diag = input.diagnostics;

  const block = [
    "================================",
    `Runtime Type:    ${input.runtimeType}`,
    `Creator:         ${input.creator}`,
    `Theme:           ${input.theme.packageId}`,
    `Website:         ${input.websiteId ?? "-"}`,
    `Tenant:          ${input.tenantId ?? "-"}`,
    `Slug:            ${input.slug ?? "-"}`,
    `Store Version:   ${input.storeVersion ?? "-"}`,
    `Correlation:     ${input.correlationId ?? "-"}`,
    "",
    "Aggregate counts",
    `  hero: ${counts.hero}  products: ${counts.products}  services: ${counts.services}  courses: ${counts.courses}  gallery: ${counts.gallery}`,
    `  faq: ${counts.faq}  testimonials: ${counts.testimonials}  timeline: ${counts.timeline}  games: ${counts.games}  contentFeed: ${counts.contentFeed}  links: ${counts.links}`,
    "",
    `Resolved sections: ${sections.all.length}`,
    `Hidden sections:   ${sections.hidden.length}`,
    `Visible sections:  ${sections.visible.length}`,
    `Rendered components: ${sections.components.join(", ")}`,
    "",
    "Asset integrity",
    `  invalid asset ids: ${diag?.invalidAssetIds?.length ?? 0}${diag?.invalidAssetIds?.length ? " " + JSON.stringify(diag.invalidAssetIds) : ""}`,
    `  skipped assets:    ${diag?.skippedAssets ?? 0}`,
    `  module failures:   ${diag?.moduleFailures?.length ?? 0}${diag?.moduleFailures?.length ? " " + diag.moduleFailures.join("; ") : ""}`,
    "",
    "Timings (ms)",
    `  aggregate: ${timings.aggregateMs ?? "-"}  resolve: ${timings.resolveMs ?? "-"}  total: ${timings.totalMs ?? "-"}`,
    "",
    `Runtime Signature: ${signature}`,
    "================================",
  ];
  console.log(`[RuntimeTrace] ${input.runtimeType}\n${block.join("\n")}`);

  // Machine-readable line for tooling / E2E signature comparison.
  console.log(`[RuntimeTrace] ${JSON.stringify({
    runtimeType: input.runtimeType,
    creator: input.creator,
    websiteId: input.websiteId ?? null,
    tenantId: input.tenantId ?? null,
    slug: input.slug ?? null,
    theme: input.theme.packageId,
    storeVersion: input.storeVersion ?? null,
    correlationId: input.correlationId ?? null,
    signature,
    counts,
    resolvedSections: sections.all.length,
    hiddenSections: sections.hidden.length,
    visibleSections: sections.visible.length,
    components: sections.components,
    assetIntegrity: {
      invalidAssetIds: diag?.invalidAssetIds ?? [],
      skippedAssets: diag?.skippedAssets ?? 0,
      moduleFailures: diag?.moduleFailures ?? [],
    },
    timings,
  })}`);

  return signature;
}
