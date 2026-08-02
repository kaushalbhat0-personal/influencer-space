/**
 * Hero media decision — the SINGLE deterministic resolver in the runtime
 * pipeline (Database → websiteAggregate.build() → resolveHeroMedia() →
 * HeroRenderer → Builder/Storefront → DOM).
 *
 * IMPLEMENTATION-21 (BUG 3): no renderer is allowed to inspect raw media fields
 * (videoUrl / posterUrl / backgroundUrl / *_assetId) directly. The aggregate
 * enriches `content.hero` with the resolved decision, and every consumer reads
 * ONLY those resolved fields.
 */
export type HeroMediaKind = "video" | "image" | "background" | "placeholder";

export type HeroMediaDecision =
  | { kind: "video"; url: string; poster: string | null }
  | { kind: "image"; url: string; poster: null }
  | { kind: "background"; url: string; poster: null }
  | { kind: "placeholder"; url: null; poster: null };

export interface HeroMediaInput {
  videoUrl?: string | null;
  posterUrl?: string | null;
  backgroundUrl?: string | null;
}

export function resolveHeroMedia(input: HeroMediaInput): HeroMediaDecision {
  if (input.videoUrl) {
    return { kind: "video", url: input.videoUrl, poster: input.posterUrl ?? null };
  }
  if (input.posterUrl) {
    return { kind: "image", url: input.posterUrl, poster: null };
  }
  if (input.backgroundUrl) {
    return { kind: "background", url: input.backgroundUrl, poster: null };
  }
  return { kind: "placeholder", url: null, poster: null };
}

/** Human-readable decision for runtime traces. */
export function describeHeroMedia(input: HeroMediaInput): {
  resolvedMedia: HeroMediaKind;
  mediaType: "video" | "image";
  rendererDecision: string;
} {
  const decision = resolveHeroMedia(input);
  return {
    resolvedMedia: decision.kind,
    mediaType: decision.kind === "video" ? "video" : "image",
    rendererDecision:
      decision.kind === "video"
        ? "render <video> with poster"
        : decision.kind === "image"
          ? "render <img> poster"
          : decision.kind === "background"
            ? "render <img> background"
            : "render placeholder",
  };
}

/**
 * The enriched payload the aggregate attaches to `content.hero`. Renderers and
 * traces consume ONLY these fields (resolvedMedia / mediaType / mediaUrl /
 * mediaPoster / rendererDecision) — never the raw *_Url / *_AssetId values.
 */
export interface ResolvedHeroMediaPayload {
  resolvedMedia: HeroMediaKind;
  mediaType: "video" | "image";
  mediaUrl: string | null;
  mediaPoster: string | null;
  rendererDecision: string;
}

export function resolveHeroMediaForRuntime(input: HeroMediaInput): ResolvedHeroMediaPayload {
  const decision = resolveHeroMedia(input);
  const described = describeHeroMedia(input);
  return {
    resolvedMedia: described.resolvedMedia,
    mediaType: described.mediaType,
    mediaUrl: decision.url,
    mediaPoster: decision.poster,
    rendererDecision: described.rendererDecision,
  };
}
