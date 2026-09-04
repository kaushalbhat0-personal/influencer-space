// MIT — derived from shadcn/ui label (https://ui.shadcn.com/docs/components/label)
// Hardened: correct htmlFor association, peer-disabled + data-disabled semantics,
// native <label> keeps RSC safety (no client-only Radix needed), data-slot parity.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  "data-disabled"?: string;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    data-slot="label"
    className={cn(
      "text-sm font-medium leading-none text-[var(--text-secondary)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
