"use client";

import { useState, useEffect } from "react";

const LOGOS = [
  { name: "YouTube", color: "text-red-400" },
  { name: "Instagram", color: "text-pink-400" },
  { name: "TikTok", color: "text-cyan-400" },
  { name: "X", color: "text-zinc-300" },
  { name: "LinkedIn", color: "text-blue-400" },
  { name: "Twitch", color: "text-purple-400" },
];

const STATS = [
  { value: "10K+", label: "Storefronts generated" },
  { value: "5K+", label: "Creators onboarded" },
  { value: "8", label: "Platforms supported" },
  { value: "< 2 min", label: "Setup time" },
];

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const step = Math.max(1, Math.floor(target / 30));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, duration / 30);
    return () => clearInterval(timer);
  }, [target]);

  return <>{count.toLocaleString()}{suffix}</>;
}

export function TrustedBy() {
  return (
    <section className="relative px-4 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-7xl">
        {/* Platform badges */}
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Works with your existing platforms
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {LOGOS.map((platform) => (
              <span
                key={platform.name}
                className={`flex items-center gap-1.5 text-sm font-semibold ${platform.color} opacity-70`}
              >
                {platform.name}
              </span>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-white sm:text-3xl">
                {stat.value.includes("+") || stat.value.includes("<") ? (
                  stat.value
                ) : (
                  <AnimatedCounter
                    target={parseInt(stat.value.replace(/,/g, ""))}
                    suffix={stat.value.includes("+") ? "+" : ""}
                  />
                )}
              </p>
              <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
