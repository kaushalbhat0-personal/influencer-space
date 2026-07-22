"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";

export interface ProvisionEvent {
  id: string;
  step: string;
  event: "started" | "completed" | "failed";
  message: string | null;
  timestamp: string;
}

interface ProvisioningTimelineProps {
  runId: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  } catch {
    return "--:--:--";
  }
}

function stepLabel(step: string): string {
  return step.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProvisioningTimeline({ runId, onComplete, onError }: ProvisioningTimelineProps) {
  const [events, setEvents] = useState<ProvisionEvent[]>([]);
  const [status, setStatus] = useState<string>("RUNNING");
  const [error, setLocalError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<string>("IMPORT_REQUESTED");

  const poll = useCallback(async () => {
    try {
      const mod = await import("@/actions/provision.actions");
      const result = await mod.getProvisionRun(runId);
      if (!result.success) {
        setLocalError(result.error || "Failed to load provisioning status");
        return;
      }
      if (!result.data) return;

      const mapped: ProvisionEvent[] = result.data.events.map((e: { id: string; step: string; event: string; message: string | null; timestamp: string | Date }) => ({
        id: e.id,
        step: e.step,
        event: e.event as "started" | "completed" | "failed",
        message: e.message,
        timestamp: typeof e.timestamp === "string" ? e.timestamp : e.timestamp.toISOString(),
      }));
      setEvents(mapped);
      setStatus(result.data.status);
      setActiveStep(result.data.currentStep);

      if (result.data.status === "COMPLETED") {
        onComplete();
      } else if (result.data.status === "FAILED") {
        const failEvent = mapped.find((e) => e.event === "failed");
        const errMsg = result.data.error || failEvent?.message || "Provisioning failed";
        setLocalError(errMsg);
        onError(errMsg);
      }
    } catch {
      // Silently retry on next poll
    }
  }, [runId, onComplete, onError]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [poll]);

  const isRunning = status === "RUNNING" || status === "PENDING";
  const isFailed = status === "FAILED";
  const isCompleted = status === "COMPLETED";

  const allSteps = [
    "IMPORT_REQUESTED", "ANALYZING", "PROFILE_READY",
    "PROVISIONING", "TENANT_CREATED", "WORKSPACE_CREATED",
    "ADMIN_CREATED", "WEBSITE_CREATED", "PUBLISHED", "READY",
  ];

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {isRunning && <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />}
        {isCompleted && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
        {isFailed && <XCircle className="h-5 w-5 text-red-400" />}
        <div>
          <h3 className="text-sm font-semibold text-white">
            {isRunning && "Provisioning in progress..."}
            {isCompleted && "Provisioning complete"}
            {isFailed && "Provisioning failed"}
          </h3>
          {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {allSteps.map((step, i) => {
          const stepEvents = events.filter((e) => e.step === step);
          const completed = stepEvents.some((e) => e.event === "completed");
          const failed = stepEvents.some((e) => e.event === "failed");
          const isActive = activeStep === step && isRunning;
          const isPending = !completed && !failed && !isActive;

          return (
            <div key={step} className="flex items-start gap-3">
              {/* Indicator */}
              <div className="flex flex-col items-center pt-1">
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                  completed && "border-emerald-500 bg-emerald-500/20",
                  failed && "border-red-500 bg-red-500/20",
                  isActive && "border-indigo-500 bg-indigo-500/20",
                  isPending && "border-zinc-700 bg-zinc-800/50",
                )}>
                  {completed && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  {failed && <XCircle className="h-3 w-3 text-red-400" />}
                  {isActive && <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />}
                  {isPending && <Clock className="h-3 w-3 text-zinc-600" />}
                </div>
                {i < allSteps.length - 1 && (
                  <div className={cn(
                    "w-px h-4 mt-0.5",
                    completed ? "bg-emerald-500/30" : "bg-zinc-800"
                  )} />
                )}
              </div>

              {/* Content */}
              <div className={cn("flex-1 pb-2 min-w-0", isPending && "opacity-40")}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cn(
                    "text-sm font-medium",
                    completed && "text-emerald-300",
                    failed && "text-red-400",
                    isActive && "text-indigo-300",
                    isPending && "text-zinc-600",
                  )}>
                    {stepLabel(step)}
                  </span>
                  <span className="text-[10px] text-zinc-600 shrink-0 font-mono">
                    {completed || failed
                      ? formatTime(stepEvents[stepEvents.length - 1]?.timestamp || "")
                      : isActive
                        ? "in progress"
                        : ""
                    }
                  </span>
                </div>
                {stepEvents.length > 0 && stepEvents[stepEvents.length - 1]?.message && (
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    {stepEvents[stepEvents.length - 1].message}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
