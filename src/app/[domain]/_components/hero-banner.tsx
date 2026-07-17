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
      {videoUrl && !videoEnded ? (
        <HeroMedia
          type="video"
          url={videoUrl}
          alignmentClass={videoAlign}
          opacity="opacity-40"
          className="absolute inset-0 transition-opacity duration-700"
          autoPlay
          muted
          playsInline
          loop={false}
          poster={posterUrl}
          onEnded={() => setVideoEnded(true)}
        />
      ) : posterUrl ? (
        <HeroMedia
          type="image"
          url={posterUrl}
          alignmentClass={imageAlign}
          opacity="opacity-40"
          className="absolute inset-0 transition-opacity duration-700"
        />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-zinc-950" />
    </div>
  );
}
