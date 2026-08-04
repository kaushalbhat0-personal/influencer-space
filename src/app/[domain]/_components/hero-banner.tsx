"use client";

import { useState } from "react";
import { HeroMedia, responsiveAlignmentClass } from "@/components/shared/HeroMedia";

type Alignment = "top" | "center" | "bottom";

interface HeroBannerProps {
  videoUrl?: string;
  posterUrl?: string;
  videoDesktopAlignment?: Alignment;
  videoMobileAlignment?: Alignment;
  imageDesktopAlignment?: Alignment;
  imageMobileAlignment?: Alignment;
}

/**
 * IMPLEMENTATION-43 Phase 8: seamless hero. The video and poster stay mounted
 * and cross-fade on end (no abrupt unmount/remount → no visible gap/outline),
 * and a tall bottom gradient merges the media into the following section so the
 * page scrolls continuously with no hard seam.
 */
export function HeroBanner({
  videoUrl,
  posterUrl,
  videoDesktopAlignment,
  videoMobileAlignment,
  imageDesktopAlignment,
  imageMobileAlignment,
}: HeroBannerProps) {
  const [videoEnded, setVideoEnded] = useState(false);

  const videoAlign = responsiveAlignmentClass(videoDesktopAlignment, videoMobileAlignment);
  const imageAlign = responsiveAlignmentClass(imageDesktopAlignment, imageMobileAlignment);

  if (!videoUrl && !posterUrl) return null;

  return (
    <div className="relative w-full h-[35vh] sm:h-[40vh] bg-neutral-950 overflow-hidden">
      {videoUrl && (
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${videoEnded ? "opacity-0" : "opacity-100"}`}
          aria-hidden={videoEnded}
        >
          <HeroMedia
            type="video"
            url={videoUrl}
            alignmentClass={videoAlign}
            opacity="opacity-40"
            className="absolute inset-0"
            autoPlay
            muted
            playsInline
            loop={false}
            poster={posterUrl}
            onEnded={() => setVideoEnded(true)}
          />
        </div>
      )}
      {posterUrl && (
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${videoEnded || !videoUrl ? "opacity-100" : "opacity-0"}`}
        >
          <HeroMedia
            type="image"
            url={posterUrl}
            alignmentClass={imageAlign}
            opacity="opacity-40"
            className="absolute inset-0"
          />
        </div>
      )}

      {/* Tall bottom fade — merges hero media into the next section (no seam). */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent via-70% to-[var(--surface-root,#0A0A0B)]" />
    </div>
  );
}
