"use client";

import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

export function useReducedMotion(): boolean | null {
  return useFramerReducedMotion();
}
