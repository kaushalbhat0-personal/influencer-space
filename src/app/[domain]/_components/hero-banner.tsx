"use client";

import { useState } from "react";

interface HeroBannerProps {
  videoUrl?: string;
  posterUrl?: string;
}

export function HeroBanner({ videoUrl, posterUrl }: HeroBannerProps) {
  const [videoEnded, setVideoEnded] = useState(false);

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
          className="absolute inset-0 w-full h-full object-cover opacity-40 transition-opacity duration-700"
        />
      ) : posterUrl ? (
        <img
          src={posterUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 transition-opacity duration-700"
        />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-zinc-950" />
    </div>
  );
}
