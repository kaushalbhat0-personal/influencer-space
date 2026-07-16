"use client";

import { useState } from "react";

type Alignment = "top" | "center" | "bottom";

interface SettingsLivePreviewProps {
  videoUrl: string;
  posterUrl: string;
  desktopAlignment: Alignment;
  mobileAlignment: Alignment;
  profileUrl: string | null;
  name: string;
  tagline: string;
  bio: string;
  liveBadgeText: string;
  showLiveBadge: boolean;
}

const objectClasses: Record<Alignment, string> = {
  top: "object-top",
  center: "object-center",
  bottom: "object-bottom",
};

export function SettingsLivePreview({
  videoUrl,
  posterUrl,
  desktopAlignment,
  mobileAlignment,
  profileUrl,
  name,
  tagline,
  bio,
  liveBadgeText,
  showLiveBadge,
}: SettingsLivePreviewProps) {
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [previewMedia, setPreviewMedia] = useState<"video" | "image">("video");

  const activeAlignment = previewDevice === "desktop" ? desktopAlignment : mobileAlignment;
  const objectPos = objectClasses[activeAlignment] || "object-center";
  const isMobile = previewDevice === "mobile";
  const showVideo = previewMedia === "video" && Boolean(videoUrl);
  const heroHeight = isMobile ? 230 : 180;

  return (
    <div className="w-full max-w-[320px] mx-auto space-y-3">
      <div className="flex justify-center gap-1 rounded-lg bg-zinc-800/50 p-1">
        <button
          type="button"
          onClick={() => setPreviewDevice("mobile")}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            isMobile
              ? "bg-s8ul-cyan/20 text-s8ul-cyan ring-1 ring-s8ul-cyan/30"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Mobile
        </button>
        <button
          type="button"
          onClick={() => setPreviewDevice("desktop")}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            !isMobile
              ? "bg-s8ul-cyan/20 text-s8ul-cyan ring-1 ring-s8ul-cyan/30"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Desktop
        </button>
      </div>

      {Boolean(videoUrl || posterUrl) && (
        <div className="flex justify-center gap-1 rounded-lg bg-zinc-800/50 p-1">
          <button
            type="button"
            onClick={() => setPreviewMedia("video")}
            disabled={!videoUrl}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              previewMedia === "video"
                ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30"
                : videoUrl
                  ? "text-zinc-500 hover:text-zinc-300"
                  : "text-zinc-700 cursor-not-allowed"
            }`}
          >
            Video
          </button>
          <button
            type="button"
            onClick={() => setPreviewMedia("image")}
            disabled={!posterUrl}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              previewMedia === "image"
                ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
                : posterUrl
                  ? "text-zinc-500 hover:text-zinc-300"
                  : "text-zinc-700 cursor-not-allowed"
            }`}
          >
            Poster
          </button>
        </div>
      )}

      <div
        className={`overflow-hidden shadow-2xl shadow-black/50 bg-[#0f0f13] ${
          isMobile
            ? "rounded-[2.5rem] border-[6px] border-zinc-800 mx-auto"
            : "rounded-lg border border-zinc-700 w-full"
        }`}
      >
        {isMobile && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-7 bg-zinc-800 rounded-b-2xl z-20" />
        )}

        <div className="relative w-full bg-zinc-950" style={{ height: heroHeight }}>
          <div className="relative w-full h-full overflow-hidden bg-neutral-950">
            {showVideo ? (
              <video
                key={videoUrl}
                src={videoUrl}
                controls
                muted
                playsInline
                className={`absolute inset-0 w-full h-full object-cover ${objectPos}`}
              />
            ) : posterUrl ? (
              <img
                src={posterUrl}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover opacity-70 ${objectPos}`}
              />
            ) : (
              <div className="absolute inset-0 bg-zinc-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0f0f13]" />

            {showLiveBadge && liveBadgeText && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400">
                  {liveBadgeText}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 flex justify-center -mt-12">
          <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white/10 ring-4 ring-[#0f0f13] bg-zinc-800">
            {profileUrl ? (
              <img
                src={profileUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg className="h-full w-full p-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
        </div>

        <div className="px-5 pt-3 pb-6 text-center">
          <h2 className="text-sm font-bold text-white leading-tight">
            {name || "Your Name"}
          </h2>
          {tagline && (
            <p className="mt-1 text-[11px] text-zinc-400 leading-snug">{tagline}</p>
          )}
          {bio && (
            <p className="mt-2 text-[10px] text-zinc-500 leading-relaxed">{bio}</p>
          )}
        </div>

        <div className="border-t border-white/5 px-5 py-3">
          <div className="flex justify-center gap-2">
            <div className="h-8 w-8 rounded-full bg-zinc-800" />
            <div className="h-8 w-8 rounded-full bg-zinc-800" />
            <div className="h-8 w-8 rounded-full bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
