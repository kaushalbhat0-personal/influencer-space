"use client";

import { useState, useCallback } from "react";

export function usePlatformStatus() {
  const [ready, setReady] = useState(true);

  const check = useCallback(async () => {
    setReady(true);
  }, []);

  return { ready, check };
}
