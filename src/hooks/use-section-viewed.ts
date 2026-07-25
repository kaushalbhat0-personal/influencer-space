"use client";

import { useEffect, useRef } from "react";
import { MarketingEvents } from "@/lib/analytics/marketing";

export function useSectionViewed(sectionId: string, sectionName: string): void {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;

    const el = document.getElementById(sectionId);
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !tracked.current) {
            tracked.current = true;
            MarketingEvents.sectionViewed(sectionId, sectionName);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [sectionId, sectionName]);
}
