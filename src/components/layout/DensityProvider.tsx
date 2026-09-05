"use client";

import { useEffect } from "react";

type Density = "compact" | "comfortable" | "spacious";

export function DensityProvider({
  density,
  children,
}: {
  density: Density;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    // comfortable is :root default, but set explicitly so switching is deterministic
    root.dataset.density = density;
  }, [density]);

  return <>{children}</>;
}

// Helper for live updates from AppearanceManager without full reload
export function setDensityAttribute(density: Density) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.density = density;
  }
}
