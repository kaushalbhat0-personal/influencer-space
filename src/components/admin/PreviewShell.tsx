"use client";

import { useState } from "react";
import { Smartphone, Tablet, Monitor } from "lucide-react";

type Device = "mobile" | "tablet" | "desktop";

const deviceConfig: Record<Device, { width: number; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  mobile: { width: 375, label: "Mobile", icon: Smartphone },
  tablet: { width: 768, label: "Tablet", icon: Tablet },
  desktop: { width: 1200, label: "Desktop", icon: Monitor },
};

function scaleFor(width: number, containerWidth: number): number {
  if (width <= containerWidth) return 1;
  return containerWidth / width;
}

export function PreviewShell({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<Device>("mobile");
  const cfg = deviceConfig[device];

  return (
    <div className="sticky top-4 w-[340px] shrink-0 lg:w-[420px]">
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
      <div
        className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950"
        style={{ height: device === "mobile" ? 640 : device === "tablet" ? 900 : 600 }}
      >
        <div
          className="overflow-y-auto"
          style={{
            width: cfg.width,
            transform: `scale(${scaleFor(cfg.width, device === "mobile" ? 322 : device === "tablet" ? 402 : 402)})`,
            transformOrigin: "top left",
          }}
        >
          <div className="min-h-full bg-zinc-950 px-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
