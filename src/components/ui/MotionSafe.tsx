"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { HTMLMotionProps } from "framer-motion";

export function MotionDiv(props: HTMLMotionProps<"div">) {
  const reduced = useReducedMotion();

  if (reduced) {
    const { className, children } = props;
    return (
      <div className={className}>
        {children as React.ReactNode}
      </div>
    );
  }

  return <motion.div {...props} />;
}

export function MotionPresence({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <>{children}</>;
  }

  return <AnimatePresence>{children}</AnimatePresence>;
}
