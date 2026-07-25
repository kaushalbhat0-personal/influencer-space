"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, SkipForward, RefreshCw } from "lucide-react";
import { MarketingEvents } from "@/lib/analytics/marketing";

interface DemoStage {
  id: string;
  label: string;
  durationMs: number;
}

const STAGES: DemoStage[] = [
  { id: "platform", label: "Detecting platform...", durationMs: 900 },
  { id: "videos", label: "Found 182 videos", durationMs: 1100 },
  { id: "niche", label: "Tech Creator detected", durationMs: 800 },
  { id: "colors", label: "Brand colors extracted", durationMs: 1000 },
  { id: "links", label: "Social links discovered", durationMs: 1200 },
  { id: "products", label: "Products recommended", durationMs: 1400 },
  { id: "seo", label: "SEO metadata generated", durationMs: 1000 },
  { id: "ready", label: "Storefront ready!", durationMs: 1500 },
];

type DemoState = "idle" | "running" | "completed" | "skipped" | "error";

export interface AIDemoProps {
  onComplete?: () => void;
  onCtaClick?: () => void;
}

export function AIDemo({ onComplete, onCtaClick }: AIDemoProps) {
  const [state, setState] = useState<DemoState>("idle");
  const [currentStage, setCurrentStage] = useState(0);
  const [replays, setReplays] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startTimeRef = useRef(0);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const stageTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const runStages = useCallback((startFrom = 0, skipToEnd = false) => {
    clearTimers();
    setCurrentStage(startFrom);
    startTimeRef.current = Date.now();

    if (reducedMotion || skipToEnd) {
      setCurrentStage(STAGES.length - 1);
      stageTimer(() => {
        setState("completed");
        onComplete?.();
        MarketingEvents.aiDemoCompleted(Date.now() - startTimeRef.current, skipToEnd);
      }, 300);
      return;
    }

    for (let i = startFrom; i < STAGES.length; i++) {
      const delay = STAGES.slice(startFrom, i + 1).reduce((sum, s) => sum + s.durationMs, 0);
      stageTimer(() => {
        setCurrentStage(i);
        if (i === STAGES.length - 1) {
          setState("completed");
          onComplete?.();
          MarketingEvents.aiDemoCompleted(Date.now() - startTimeRef.current, false);
          setTimeout(() => { ctaRef.current?.focus(); }, 100);
        }
      }, delay);
    }
  }, [clearTimers, stageTimer, reducedMotion, onComplete]);

  const startDemo = useCallback(() => {
    setState("running");
    MarketingEvents.aiDemoStarted("manual");
    runStages(0);
  }, [runStages]);

  const skipDemo = useCallback(() => {
    setState("skipped");
    MarketingEvents.aiDemoSkipped(currentStage);
    runStages(0, true);
  }, [currentStage, runStages]);

  const replayDemo = useCallback(() => {
    const next = replays + 1;
    setReplays(next);
    MarketingEvents.aiDemoReplay(next);
    startDemo();
  }, [replays, startDemo]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const getStageIcon = (index: number) => {
    if (state === "idle" || (state === "running" && index > currentStage)) {
      return <div className="h-3 w-3 rounded-full border border-zinc-700 shrink-0" />;
    }
    if (state === "running" && index === currentStage) {
      return <Loader2 className="h-3.5 w-3.5 text-indigo-400 animate-spin shrink-0" />;
    }
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
  };

  const getStageOpacity = (index: number) => {
    if (state === "idle") return "opacity-50";
    if (state === "running" && index > currentStage) return "opacity-40";
    return "opacity-100";
  };

  const isComplete = state === "completed" || state === "skipped";

  return (
    <section id="ai-demo" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            See AI build a{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              storefront
            </span>{" "}
            in real-time
          </h2>
          <p className="mt-3 text-zinc-500">
            Watch how CreatorStore analyzes a creator profile and generates a complete business.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface-base)]/50 p-6 sm:p-8 min-h-[320px] flex flex-col">
          {/* Stage list */}
          <div className="flex-1 space-y-3" role="status" aria-live="polite" aria-label="AI Demo progress">
            {STAGES.map((stage, i) => (
              <div key={stage.id} className={`flex items-center gap-3 transition-opacity duration-300 ${getStageOpacity(i)}`}>
                {getStageIcon(i)}
                <span className="text-sm text-zinc-300">{stage.label}</span>
              </div>
            ))}
          </div>

          {/* CTA Row — always visible */}
          <div className="mt-6 pt-6 border-t border-white/[0.06] space-y-3">
            {state === "idle" && (
              <button onClick={startDemo} className="btn-primary w-full py-3 text-sm">
                Start Demo
              </button>
            )}
            {(state === "running" || isComplete) && (
              <Link
                ref={isComplete ? ctaRef : undefined}
                href="/signup"
                onClick={onCtaClick}
                tabIndex={0}
                className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 whitespace-normal break-words"
              >
                Generate Your Storefront — Free
              </Link>
            )}
            <div className="flex gap-2">
              {state === "running" && (
                <button onClick={skipDemo} className="btn-secondary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5">
                  <SkipForward className="h-3.5 w-3.5" aria-hidden="true" /> Skip to Result
                </button>
              )}
              {isComplete && (
                <button onClick={replayDemo} className="btn-secondary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Watch Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
