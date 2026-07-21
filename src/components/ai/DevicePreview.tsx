"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { Monitor, Tablet, Smartphone } from "lucide-react";

export type DeviceType = "desktop" | "tablet" | "mobile";

interface DevicePreviewProps {
  children: React.ReactNode;
  defaultDevice?: DeviceType;
  className?: string;
  label?: string;
}

const DEVICE_CONFIG: Record<DeviceType, { width: string; icon: typeof Monitor; label: string }> = {
  desktop: { width: "w-full", icon: Monitor, label: "Desktop" },
  tablet: { width: "max-w-[768px]", icon: Tablet, label: "Tablet" },
  mobile: { width: "max-w-[375px]", icon: Smartphone, label: "Mobile" },
};

export function DevicePreview({
  children,
  defaultDevice = "desktop",
  className,
  label = "Website Preview",
}: DevicePreviewProps) {
  const [device, setDevice] = useState<DeviceType>(defaultDevice);
  const config = DEVICE_CONFIG[device];

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="mb-3 flex items-center gap-1 rounded-lg bg-white/5 p-1" role="toolbar" aria-label="Device preview mode">
        {(Object.entries(DEVICE_CONFIG) as [DeviceType, typeof config][]).map(
          ([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setDevice(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                device === key
                  ? "bg-s8ul-cyan/20 text-s8ul-cyan"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
              aria-pressed={device === key}
              aria-label={cfg.label}
            >
              <cfg.icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{cfg.label}</span>
            </button>
          )
        )}
      </div>

      <div
        className={cn(
          config.width,
          "w-full rounded-lg border border-white/10 bg-[var(--surface-root)] overflow-hidden transition-all duration-300",
          device === "mobile" && "mx-auto"
        )}
        role="region"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}
