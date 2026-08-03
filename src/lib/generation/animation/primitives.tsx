"use client";

/**
 * Generation Animation Primitives — IMPLEMENTATION-28.
 *
 * Reusable motion primitives that ONLY visualize runtime state. They never
 * calculate or own progress — they react to the values passed in. Fully
 * respects prefers-reduced-motion (instant updates, no movement/glow/pulse).
 *
 * Not coupled to onboarding — reusable for publishing, theme apply, AI
 * regeneration, media processing, course imports, long-running jobs.
 */
import { motion, AnimatePresence, useReducedMotion, animate } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { normalizeProgress, progressAria } from "./progress";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade + gentle rise on enter; fade on exit. Reduced motion → instant. */
export function FadeIn({
  children,
  className,
  duration = 0.28,
  animateOnMount = true,
  dataStage,
  dataStatus,
  dataTestid,
}: {
  children: ReactNode;
  className?: string;
  duration?: number;
  /** When false, the entrance animation is skipped (status-driven re-renders still settle). */
  animateOnMount?: boolean;
  dataStage?: string;
  dataStatus?: string;
  dataTestid?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      data-stage={dataStage}
      data-status={dataStatus}
      data-testid={dataTestid}
      initial={animateOnMount ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: reduce ? 0 : duration, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** AnimatePresence wrapper for enter/exit sequences. */
export function TransitionGroup({ children }: { children: ReactNode }) {
  return <AnimatePresence mode="popLayout" initial={false}>{children}</AnimatePresence>;
}

/** Subtle success icon transition (scale settle, no bounce). */
export function SuccessIcon({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="inline-flex"
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "tween", duration: reduce ? 0 : 0.22, ease: EASE }}
    >
      {children}
    </motion.span>
  );
}

/**
 * Progress bar that smoothly interpolates to the exact runtime value.
 * Uses transform (scaleX) — no layout, no overshoot, no looping. Ends exactly
 * on the target value.
 */
export function ProgressBar({
  value,
  className,
  barClassName,
  testId,
  ariaLabel,
}: { value: number; className?: string; barClassName?: string; testId?: string; ariaLabel?: string }) {
  const reduce = useReducedMotion();
  const clamped = normalizeProgress(value);
  const aria = progressAria(value);
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-[var(--surface-card-hover,#27272A)]", className)}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={aria.valuemin}
      aria-valuemax={aria.valuemax}
      aria-valuenow={aria.valuenow}
      data-testid={testId}
    >
      <motion.div
        className={cn("h-full w-full origin-left rounded-full bg-gradient-to-r from-indigo-500 to-purple-500", barClassName)}
        initial={false}
        animate={{ scaleX: clamped / 100 }}
        transition={{ type: "tween", duration: reduce ? 0 : 0.45, ease: EASE }}
      />
    </div>
  );
}

/** Soft glow indicator for the current stage (opacity pulse — cheap, no shadow). */
export function GlowIndicator({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={cn("inline-block h-4 w-4 rounded-full border border-[var(--brand-primary,#6366F1)]", className)}
      initial={{ opacity: 0.45 }}
      animate={reduce ? { opacity: 0.45 } : { opacity: [0.45, 1, 0.45] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** Crossfades between children when the key changes (text/title swaps). */
export function Crossfade({ value, children }: { value: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={value}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

/** Counter that tweens to the exact target (no overshoot; lands precisely). */
export function useAnimatedNumber(target: number, duration = 0.5): number {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    ref.current = target;
    if (reduce) { setDisplay(target); return; }
    const controls = animate(ref.current, target, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return Math.round(display);
}
