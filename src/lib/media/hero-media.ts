/**
 * Hero media decision — the SINGLE deterministic resolver shared by the
 * HeroRenderer (Builder + Storefront) and the runtime trace.
 *
 * IMPLEMENTATION-20 (Phase C): video → poster → background → placeholder.
 * The avatar NEVER replaces media; the avatar always overlaps the media.
 */
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

/** Human-readable decision for runtime traces (Phase D). */
export function describeHeroMedia(input: HeroMediaInput): {
  resolvedMedia: HeroMediaDecision["kind"];
  rendererDecision: string;
} {
  const decision = resolveHeroMedia(input);
  return {
    resolvedMedia: decision.kind,
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
