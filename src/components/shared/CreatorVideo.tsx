"use client";

import { useState, type VideoHTMLAttributes } from "react";

export interface CreatorVideoProps {
  src: string | null | undefined;
  poster?: string | null;
  alt?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
  className?: string;
  aspectRatio?: string;
  fallback?: string;
}

export function CreatorVideo({
  src,
  poster,
  alt,
  controls = false,
  autoPlay = false,
  muted = false,
  loop = false,
  playsInline = false,
  preload = "metadata",
  className = "",
  aspectRatio = "16/9",
  fallback,
}: CreatorVideoProps) {
  const [hasError, setHasError] = useState(false);
  const [canPlay, setCanPlay] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-800 ${className}`}
        style={{ aspectRatio }}
        role="img"
        aria-label={alt ?? "Video placeholder"}
      >
        <span className="text-xs text-[var(--text-muted)]">{fallback ?? "Video unavailable"}</span>
      </div>
    );
  }

  const videoProps: VideoHTMLAttributes<HTMLVideoElement> & { preload?: string } = {
    src,
    poster: poster ?? undefined,
    controls,
    autoPlay,
    muted,
    loop,
    playsInline,
    preload,
    className: `h-full w-full object-cover ${className}`,
    style: { aspectRatio },
    onError: () => setHasError(true),
    onCanPlay: () => setCanPlay(true),
  };

  if (autoPlay && !canPlay) {
    return (
      <div className={`relative ${className}`} style={{ aspectRatio }}>
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={alt ?? ""}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <video {...(videoProps as VideoHTMLAttributes<HTMLVideoElement>)} className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ aspectRatio }}>
      <video {...(videoProps as VideoHTMLAttributes<HTMLVideoElement>)} />
    </div>
  );
}
