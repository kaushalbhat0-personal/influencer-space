"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  tiltDegree?: number;
  perspective?: number;
}

export function TiltCard({
  children,
  className,
  tiltDegree = 8,
  perspective = 1000,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const springConfig = { stiffness: 150, damping: 20 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const rotateX = useTransform(ySpring, [0, 1], [tiltDegree, -tiltDegree]);
  const rotateY = useTransform(xSpring, [0, 1], [-tiltDegree, tiltDegree]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xVal = (e.clientX - rect.left) / rect.width;
    const yVal = (e.clientY - rect.top) / rect.height;
    x.set(xVal);
    y.set(yVal);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, perspective }}
      className={cn("transition-transform duration-100", className)}
    >
      {children}
    </motion.div>
  );
}
