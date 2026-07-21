"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface ScoreRingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "success" | "warning" | "danger" | "default";
  label?: string;
  showPercent?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { dim: 80, stroke: 6, fontSize: "text-xl" },
  md: { dim: 120, stroke: 8, fontSize: "text-2xl" },
  lg: { dim: 160, stroke: 10, fontSize: "text-3xl" },
  xl: { dim: 200, stroke: 12, fontSize: "text-4xl" },
} as const;

const VARIANT_COLORS = {
  success: { stroke: "#22C55E", bg: "rgba(34,197,94,0.15)" },
  warning: { stroke: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
  danger: { stroke: "#EF4444", bg: "rgba(239,68,68,0.15)" },
  default: { stroke: "#00F5FF", bg: "rgba(0,245,255,0.1)" },
};

export function ScoreRing({
  value,
  max = 100,
  size = "md",
  variant = "default",
  label,
  showPercent = true,
  className,
}: ScoreRingProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const reduced = useReducedMotion();
  const { dim, stroke: strokeW, fontSize } = SIZE_MAP[size];
  const radius = (dim - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((value / max) * 100, 100);
  const colors = VARIANT_COLORS[variant];

  useEffect(() => {
    if (reduced) {
      setDisplayValue(percentage);
      return;
    }
    const start = performance.now();
    const duration = 1000;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(percentage * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [percentage, reduced]);

  const offset = circumference - (displayValue / 100) * circumference;

  return (
    <div
      className={cn("flex flex-col items-center justify-center", className)}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label ?? `Score: ${value} out of ${max}`}
    >
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={colors.bg}
            strokeWidth={strokeW}
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
            style={{ transition: reduced ? "none" : "stroke-dashoffset 0.3s ease-out" }}
            className="drop-shadow-[0_0_6px_rgba(0,245,255,0.4)]"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(fontSize, "font-bold font-display text-white tabular-nums")}>
            {displayValue}
          </span>
          {showPercent && (
            <span className="text-xs text-zinc-500 font-display">%</span>
          )}
        </div>
      </div>
      {label && (
        <p className="mt-3 text-sm font-medium text-zinc-400 text-center">{label}</p>
      )}
    </div>
  );
}
