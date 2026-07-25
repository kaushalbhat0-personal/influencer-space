"use client";

import { useEffect, useRef, useState } from "react";
import type { TrustLogo } from "@/lib/marketing/trust/types";

interface IntegrationLogosProps {
  readonly logos: readonly TrustLogo[];
  readonly title?: string;
  readonly centered?: boolean;
}

const LOGO_COLORS: Record<string, string> = {
  YouTube: "text-red-400",
  Instagram: "text-pink-400",
  TikTok: "text-cyan-400",
  "X (Twitter)": "text-zinc-300",
  LinkedIn: "text-blue-400",
  Twitch: "text-purple-400",
  Razorpay: "text-blue-300",
  UPI: "text-green-400",
  Vercel: "text-white",
  "Next.js": "text-white",
};

export function IntegrationLogos({
  logos,
  title = "Works with your existing platforms",
  centered = true,
}: IntegrationLogosProps) {
  if (logos.length === 0) return null;

  return (
    <div className={centered ? "text-center" : ""}>
      {title && (
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          {title}
        </p>
      )}
      <div
        className={`mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 ${
          centered ? "justify-center" : ""
        }`}
      >
        {logos.map((logo) => (
          <span
            key={logo.id}
            className={`flex items-center gap-1.5 text-sm font-semibold ${
              LOGO_COLORS[logo.name] ?? "text-zinc-400"
            } opacity-70`}
          >
            {logo.name}
          </span>
        ))}
      </div>
    </div>
  );
}
