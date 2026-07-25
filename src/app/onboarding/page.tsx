"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { startOnboardingGeneration } from "@/actions/onboarding.actions";
import { CheckCircle2, Globe, Rocket, AlertTriangle, Loader2 } from "lucide-react";

type OnboardingStep = "import" | "generating" | "ready" | "error";

const STAGE_LABELS: Record<string, string> = {
  source_resolution: "Detecting platform",
  profile_extraction: "Extracting creator profile",
  content_extraction: "Importing content",
  ai_content_generation: "AI analyzing your brand",
  theme_selection: "Selecting theme",
  website_composition: "Building website structure",
  tenant_provisioning: "Creating your workspace",
  finalization: "Finalizing",
};

export default function OnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const socialUrl = params.get("url") || "";
  const planCode = params.get("plan") || "creator_free";

  const [step, setStep] = useState<OnboardingStep>(socialUrl ? "generating" : "import");
  const [sourceUrl, setSourceUrl] = useState(socialUrl);
  const [stages, setStages] = useState<Array<{ stage: string; status: string; error?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ storefrontUrl?: string; builderUrl?: string } | null>(null);

  const startGeneration = useCallback(async (url: string) => {
    setLoading(true);
    setStep("generating");
    setError(null);
    setStages([]);

    try {
      const res = await startOnboardingGeneration(url, planCode);
      setStages(res.stages ?? []);

      if (res.success && res.result) {
        setResult({
          storefrontUrl: res.result.storefrontUrl,
          builderUrl: res.result.dashboardUrl,
        });
        setStep("ready");
      } else {
        setError(res.error || "Generation failed");
        setStep("error");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }, [planCode]);

  useEffect(() => {
    if (socialUrl) {
      startGeneration(socialUrl);
    }
  }, []);

  const activeStages = stages.filter((s) => s.status !== "skipped");
  const completedStages = activeStages.filter((s) => s.status === "completed");
  const failedStages = activeStages.filter((s) => s.status === "failed");
  const hasFailure = failedStages.length > 0;
  const currentStageIndex = completedStages.length;

  return (
    <div className="min-h-screen bg-[var(--surface-root)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {step === "import" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold text-white">Start with your social URL</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Paste your YouTube, Instagram, TikTok, or X profile link. AI will build your website automatically.
              </p>
            </div>

            <div>
              <label htmlFor="onboarding-url" className="block text-xs font-medium text-zinc-400 mb-1.5">
                Social Profile URL
              </label>
              <div className="flex gap-2">
                <input
                  id="onboarding-url"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://youtube.com/@creator"
                  className="flex-1 admin-input text-sm py-2.5"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[11px] text-zinc-600">
              <span>Supported:</span>
              <span className="text-red-400">YouTube</span>
              <span className="text-pink-400">Instagram</span>
              <span className="text-cyan-400">TikTok</span>
              <span className="text-blue-400">LinkedIn</span>
              <span className="text-purple-400">Twitch</span>
              <span className="text-zinc-300">X</span>
            </div>

            <button
              onClick={() => startGeneration(sourceUrl)}
              disabled={!sourceUrl.trim() || loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Generate My Website"}
            </button>

            {!socialUrl && (
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="btn-secondary w-full py-3 text-sm"
              >
                Skip — go to Dashboard
              </button>
            )}
          </div>
        )}

        {step === "generating" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-white">Building your website</h1>
              <p className="mt-1 text-sm text-zinc-400">
                AI is analyzing your profile, generating content, and setting up your workspace.
              </p>
            </div>

            <div className="space-y-1">
              {[
                "source_resolution",
                "profile_extraction",
                "content_extraction",
                "ai_content_generation",
                "theme_selection",
                "website_composition",
                "tenant_provisioning",
                "finalization",
              ].map((stageKey) => {
                const stage = stages.find((s) => s.stage === stageKey);
                const isActive = stages.length === 0 && !stage && stageKey === "source_resolution";
                const stageIndex = stages.findIndex((s) => s.stage === stageKey);
                const isCurrent = stageIndex === currentStageIndex;
                const isCompleted = stage?.status === "completed";
                const isFailed = stage?.status === "failed";

                return (
                  <div
                    key={stageKey}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 transition-all",
                      isCompleted && "text-zinc-300",
                      isCurrent && "bg-white/[0.03]",
                      isFailed && "bg-red-500/5",
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : isFailed ? (
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    ) : isCurrent || isActive ? (
                      <Loader2 className="h-4 w-4 text-indigo-400 animate-spin shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-zinc-700 shrink-0" />
                    )}
                    <span className="text-sm flex-1">
                      {STAGE_LABELS[stageKey] ?? stageKey.replace(/_/g, " ")}
                    </span>
                    {isFailed && stage?.error && (
                      <span className="text-[10px] text-red-400 text-right max-w-[160px] truncate" title={stage.error}>
                        {stage.error}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {hasFailure && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-sm text-red-400 font-medium">Some steps failed</p>
                <p className="text-xs text-zinc-400 mt-1">
                  We&apos;ll proceed with what we have. You can fix things later in the builder.
                </p>
              </div>
            )}
          </div>
        )}

        {step === "ready" && (
          <div className="text-center space-y-6">
            <div className="rounded-full bg-emerald-500/20 p-4 w-fit mx-auto">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Your website is ready!</h1>
              <p className="text-zinc-400 mt-2">
                AI has generated your storefront. You can customize everything in the builder.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push(result?.builderUrl ?? "/builder")}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                <Rocket className="h-4 w-4" /> Open Builder
              </button>
              {result?.storefrontUrl && (
                <a
                  href={result.storefrontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full py-3 inline-flex items-center justify-center gap-2"
                >
                  <Globe className="h-4 w-4" /> View Website
                </a>
              )}
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
              >
                Go to Dashboard instead
              </button>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="text-center space-y-6">
            <div className="rounded-full bg-red-500/20 p-4 w-fit mx-auto">
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
              <p className="text-zinc-400 mt-2 text-sm">{error || "Could not generate your website."}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => startGeneration(sourceUrl)}
                className="btn-primary w-full py-3"
              >
                Try Again
              </button>
              <button
                onClick={() => setStep("import")}
                className="btn-secondary w-full py-3"
              >
                Change URL
              </button>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
