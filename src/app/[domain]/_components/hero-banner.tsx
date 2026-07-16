"use client";

import { useState } from "react";

type Alignment = "top" | "center" | "bottom";

interface HeroBannerProps {
  videoUrl?: string;
  posterUrl?: string;
  videoDesktopAlignment?: Alignment;
  videoMobileAlignment?: Alignment;
  imageDesktopAlignment?: Alignment;
  imageMobileAlignment?: Alignment;
}

const mobileObjectClasses: Record<Alignment, string> = {
  top: "object-top",
  center: "object-center",
  bottom: "object-bottom",
};

const desktopObjectClasses: Record<Alignment, string> = {
  top: "sm:object-top",
  center: "sm:object-center",
  bottom: "sm:object-bottom",
};

function alignmentClass(
  desktopAlign?: Alignment,
  mobileAlign?: Alignment,
): string {
  const m = mobileObjectClasses[mobileAlign || "center"] || "object-center";
  const d = desktopObjectClasses[desktopAlign || "center"] || "sm:object-center";
  return `${m} ${d}`;
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

  const videoAlign = alignmentClass(videoDesktopAlignment, videoMobileAlignment);
  const imageAlign = alignmentClass(imageDesktopAlignment, imageMobileAlignment);

  if (!videoUrl && !posterUrl) return null;

  return (
    <div className="relative w-full h-[35vh] sm:h-[40vh] bg-neutral-950 overflow-hidden">
      {videoUrl && !videoEnded ? (
        <video
          key={videoUrl}
          src={videoUrl}
          poster={posterUrl || undefined}
          autoPlay
          muted
          playsInline
          loop={false}
          onEnded={() => setVideoEnded(true)}
          className={`absolute inset-0 w-full h-full object-cover opacity-40 transition-opacity duration-700 ${videoAlign}`}
        />
      ) : posterUrl ? (
        <img
          src={posterUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover opacity-40 transition-opacity duration-700 ${imageAlign}`}
        />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-zinc-950" />
    </div>
  );
}
