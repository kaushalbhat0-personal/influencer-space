"use client";

import { useEffect, useState, useRef } from "react";
import type { TrustMetric } from "@/lib/marketing/trust/types";
import { Section } from "@/components/marketing/Section";

interface MetricGridProps {
  readonly metrics: readonly TrustMetric[];
  readonly title?: string;
}

function parseNumericValue(value: string): number {
  const cleaned = value.replace(/[<>,+]/g, "");
  return parseInt(cleaned, 10) || 0;
}

function AnimatedMetric({ metric }: { metric: TrustMetric }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const target = parseNumericValue(metric.value);
  const hasSymbol = /[<>,]/.test(metric.value);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated || target === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 1500;
          const steps = 30;
          const increment = Math.max(1, Math.floor(target / steps));
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(current);
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated, target]);

  const displayValue = hasSymbol
    ? metric.value
    : count.toLocaleString("en-IN");

  return (
    <div className="text-center" ref={ref}>
      <p className="text-3xl font-bold text-white sm:text-4xl">
        {metric.prefix ?? ""}
        {displayValue}
        {metric.suffix ?? ""}
      </p>
      <p className="mt-1 text-sm font-medium text-zinc-300">{metric.label}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{metric.description}</p>
    </div>
  );
}

export function MetricGrid({ metrics, title }: MetricGridProps) {
  if (metrics.length === 0) return null;

  return (
    <Section id="metrics">
      {title && (
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
        </div>
      )}
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
        {metrics.map((metric) => (
          <AnimatedMetric key={metric.id} metric={metric} />
        ))}
      </div>
    </Section>
  );
}
