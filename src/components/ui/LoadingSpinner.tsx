"use client";

import { MotionDiv } from "./MotionSafe";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "h-6 w-6 border-2",
    md: "h-10 w-10 border-[3px]",
    lg: "h-16 w-16 border-4",
  } as const;

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8" role="status" aria-label={text ?? "Loading"}>
      <MotionDiv
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className={`${sizeMap[size]} rounded-full border-s8ul-cyan/30 border-t-s8ul-cyan`}
      />
      {text && <p className="text-sm text-zinc-400">{text}</p>}
      <span className="sr-only">{text ?? "Loading"}</span>
    </div>
  );
}
