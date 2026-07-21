"use client";

import { cn } from "@/lib/utils";
import { MotionDiv } from "@/components/ui/MotionSafe";

interface WizardStepProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  stepNumber?: number;
  totalSteps?: number;
  valid?: boolean;
  className?: string;
}

export function WizardStep({
  title,
  description,
  children,
  stepNumber,
  totalSteps,
  valid = true,
  className,
}: WizardStepProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("", className)}
    >
      <div className="mb-6">
        {stepNumber && totalSteps && (
          <p className="text-xs font-medium text-s8ul-cyan mb-1">
            Step {stepNumber} of {totalSteps}
          </p>
        )}
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-zinc-400 max-w-lg">{description}</p>
        )}
      </div>

      <div
        className={cn(
          "rounded-xl border border-white/10 bg-white/5 p-6 transition-colors",
          !valid && "border-red-500/30 bg-red-500/5"
        )}
      >
        {children}
      </div>
    </MotionDiv>
  );
}
