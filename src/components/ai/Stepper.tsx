"use client";

import { cn } from "@/lib/utils";
import { MotionDiv } from "@/components/ui/MotionSafe";
import { Check } from "lucide-react";

export interface StepperStep {
  id: string;
  label: string;
  description?: string;
  status: "pending" | "active" | "completed" | "error";
}

interface StepperProps {
  steps: StepperStep[];
  currentStep?: string;
  orientation?: "horizontal" | "vertical";
  size?: "default" | "compact";
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  orientation = "horizontal",
  size = "default",
  className,
}: StepperProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === currentStep || s.status === "active")
  );

  if (orientation === "vertical") {
    return (
      <nav className={cn("flex flex-col", className)} aria-label="Progress">
        {steps.map((step, i) => (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StepIcon step={step} index={i} size={size} />
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[20px]",
                    step.status === "completed" ? "bg-green-500" : "bg-white/10"
                  )}
                />
              )}
            </div>
            <div className={cn("pb-5", size === "compact" && "pb-3")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  step.status === "completed" && "text-green-400",
                  step.status === "active" && "text-s8ul-cyan",
                  step.status === "error" && "text-red-400",
                  step.status === "pending" && "text-zinc-500"
                )}
              >
                {step.label}
              </p>
              {step.description && size !== "compact" && (
                <p className="mt-0.5 text-xs text-zinc-500">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav
      className={cn("flex items-center justify-center", className)}
      aria-label="Progress"
    >
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <StepIcon step={step} index={i} size={size} />
            {size !== "compact" && (
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap max-w-[80px] text-center",
                  step.status === "completed" && "text-green-400",
                  step.status === "active" && "text-s8ul-cyan",
                  step.status === "error" && "text-red-400",
                  step.status === "pending" && "text-zinc-500"
                )}
              >
                {step.label}
              </span>
            )}
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-0.5",
                size === "compact" ? "w-6" : "w-10 md:w-20",
                step.status === "completed" ? "bg-green-500" : "bg-white/10"
              )}
            />
          )}
        </div>
      ))}
      <div className="sr-only" aria-live="polite">
        Step {currentIndex + 1} of {steps.length}: {steps[currentIndex]?.label}
      </div>
    </nav>
  );
}

function StepIcon({
  step,
  index,
  size,
}: {
  step: StepperStep;
  index: number;
  size: "default" | "compact";
}) {
  const dims = size === "compact" ? "h-6 w-6" : "h-8 w-8";
  const iconSize = size === "compact" ? "h-3 w-3" : "h-4 w-4";

  return (
    <MotionDiv
      animate={step.status === "active" ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 0.4, repeat: step.status === "active" ? Infinity : 0 }}
      className={cn(
        dims,
        "rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200",
        step.status === "completed" && "bg-green-500 text-white",
        step.status === "active" && "bg-s8ul-cyan text-black ring-2 ring-s8ul-cyan/40",
        step.status === "error" && "bg-red-500 text-white",
        step.status === "pending" && "bg-white/10 text-zinc-500"
      )}
      role="presentation"
    >
      {step.status === "completed" ? (
        <Check className={iconSize} aria-hidden="true" />
      ) : (
        <span aria-hidden="true">{index + 1}</span>
      )}
    </MotionDiv>
  );
}
