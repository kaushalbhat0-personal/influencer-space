"use client";

import { useState } from "react";

interface HeroPreviewProps {
  mediaUrl: string;
  mediaType: "video" | "image";
  alignment: "top" | "center" | "bottom";
}

const alignmentClasses: Record<string, string> = {
  top: "object-top",
  center: "object-center",
  bottom: "object-bottom",
};

export function HeroPreview({ mediaUrl, mediaType, alignment }: HeroPreviewProps) {
  const [device, setDevice] = useState<"mobile" | "desktop">("desktop");

  const objectPos = alignmentClasses[alignment] || "object-center";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDevice("desktop")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            device === "desktop"
              ? "bg-s8ul-cyan/20 text-s8ul-cyan ring-1 ring-s8ul-cyan/30"
              : "bg-zinc-800 text-zinc-400 hover:text-zinc-300"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Desktop
        </button>
        <button
          type="button"
          onClick={() => setDevice("mobile")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            device === "mobile"
              ? "bg-s8ul-cyan/20 text-s8ul-cyan ring-1 ring-s8ul-cyan/30"
              : "bg-zinc-800 text-zinc-400 hover:text-zinc-300"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Mobile
        </button>
      </div>

      <div
        className={`relative overflow-hidden border border-white/10 bg-neutral-950 ${
          device === "desktop"
            ? "w-full h-[40vh] max-w-4xl mx-auto rounded-lg"
            : "w-[320px] h-[35vh] mx-auto rounded-xl border-2 border-zinc-700"
        }`}
      >
        {mediaType === "video" ? (
          <video
            key={mediaUrl}
            src={mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            className={`absolute inset-0 w-full h-full object-cover ${objectPos}`}
          />
        ) : (
          <img
            src={mediaUrl}
            alt="Hero preview"
            className={`absolute inset-0 w-full h-full object-cover ${objectPos}`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-zinc-950 pointer-events-none" />
      </div>

      <p className="text-center text-xs text-zinc-500">
        {device === "desktop" ? "40vh desktop viewport" : "35vh mobile viewport"} &middot; Aligned {alignment}
      </p>
    </div>
  );
}
