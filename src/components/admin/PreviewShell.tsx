"use client";

import { useState, useRef, useEffect } from "react";
import { Smartphone, Tablet, Monitor } from "lucide-react";
import type { ThemeOverrides } from "@/lib/theme";

export type { ThemeOverrides } from "@/lib/theme";

type Device = "mobile" | "tablet" | "desktop";

const deviceConfig: Record<Device, { width: number; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  mobile: { width: 375, label: "Mobile", icon: Smartphone },
  tablet: { width: 768, label: "Tablet", icon: Tablet },
  desktop: { width: 1200, label: "Desktop", icon: Monitor },
};

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(340);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function PreviewShell({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme?: ThemeOverrides;
}) {
  const [device, setDevice] = useState<Device>("mobile");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerWidth = useContainerWidth(containerRef);
  const cfg = deviceConfig[device];

  const gutter = 16;
  const availWidth = containerWidth - gutter * 2;
  const scale = cfg.width > availWidth ? availWidth / cfg.width : 1;

  return (
    <div ref={containerRef} className="sticky top-4 w-[300px] shrink-0 lg:w-[380px]">
      {/* ─── Device Toggle ─── */}
      <div className="mb-3 flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 p-1">
        {(Object.entries(deviceConfig) as [Device, typeof cfg][]).map(([key, conf]) => {
          const active = key === device;
          const Icon = conf.icon;
          return (
            <button
              key={key}
              onClick={() => setDevice(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "bg-s8ul-cyan/10 text-s8ul-cyan shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{conf.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Scaled Frame ─── */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
        <div
          className="overflow-y-auto"
          style={{
            width: cfg.width,
            height: cfg.width * 1.6,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            className="min-h-full bg-zinc-950 px-4"
            style={
              theme
                ? {
                    "--accent": theme.accent,
                    "--primary": theme.primary,
                    "--secondary": theme.secondary,
                  } as React.CSSProperties
                : undefined
            }
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
