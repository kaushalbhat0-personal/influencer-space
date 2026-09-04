"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// RCCF-70.4.2 (Workstream 1) — Button Reconciliation.
// Variants map 1:1 to the canonical Premium Creator OS token classes
// (.btn-primary / .btn-secondary / .btn-ghost / .btn-danger in globals.css).
// This removes the legacy light-theme indigo/gray palette, keeps the same
// semantics/click behavior, and reuses one button presentation system.
const variantStyles = {
  default: "btn-primary",
  destructive: "btn-danger",
  outline: "btn-secondary",
  ghost: "btn-ghost",
};

// VISUAL-03A: refined sizes — tighter vertical rhythm, role-based radius via globals
const sizeStyles = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-sm gap-2",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
