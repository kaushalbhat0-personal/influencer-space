"use client";

import { useEffect, useState } from "react";

export function usePullToRefresh() {
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let touchStartY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      const currentY = e.touches[0].clientY;
      const pullDistance = currentY - touchStartY;

      if (pullDistance > 80 && !refreshing) {
        setRefreshing(true);
        isPulling = false;
        window.location.reload();
      }
    };

    const handleTouchEnd = () => {
      isPulling = false;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [refreshing]);

  return { refreshing };
}
