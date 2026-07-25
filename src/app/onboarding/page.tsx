"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { importCreatorProfile, runCreatorGeneration } from "@/actions/onboarding.actions";
import {
  CheckCircle2, Globe, Rocket, AlertTriangle, Loader2, ArrowLeft,
  Video, MessageCircle, Link as LinkIcon,
  Sparkles, Layout,
} from "lucide-react";

type OnboardingStep = "welcome" | "import" | "preview" | "generating" | "complete" | "error";

interface ProfileData {
  platform: string;
  creatorName: string;
  avatarUrl?: string;
  followers?: number;
  category?: string;
  persona: { id: string; name: string };
  confidence: number;
}

interface GenerationResult {
  tenantId: string;
  workspaceId: string;
  storefrontUrl: string;
  dashboardUrl: string;
}

const STAGE_LABELS: Record<string, string> = {
  profile_import: "Analyzing social profile",
  generation: "AI generating your storefront",
  provisioning: "Creating your workspace",
  builder_init: "Setting up the builder",
  publishing: "Publishing your storefront",
};

const PLATFORM_ICONS: Record<string, typeof Globe> = {
  youtube: Video,
  instagram: Video,
  tiktok: Video,
  twitter: MessageCircle,
  x: MessageCircle,
  linkedin: Globe,
  twitch: MessageCircle,
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: "text-red-400",
  instagram: "text-pink-400",
  tiktok: "text-cyan-400",
  twitter: "text-blue-400",
  x: "text-blue-400",
  linkedin: "text-blue-400",
  twitch: "text-purple-400",
};

function detectClientPlatform(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("youtube") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("instagram")) return "instagram";
  if (lower.includes("tiktok")) return "tiktok";
  if (lower.includes("linkedin")) return "linkedin";
  if (lower.includes("twitch")) return "twitch";
  if (lower.includes("x.com") || lower.includes("twitter")) return "x";
  return null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillUrl = params.get("url") || "";

  const [step, setStep] = useState<OnboardingStep>(prefillUrl ? "import" : "welcome");
  const [sourceUrl, setSourceUrl] = useState(prefillUrl);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(
    prefillUrl ? detectClientPlatform(prefillUrl) : null,
  );
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<Array<{ stage: string; status: string; error?: string }>>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [goldenScore, setGoldenScore] = useState<number | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!sourceUrl.trim()) return;
    setLoading(true);
    setError(null);

    const platform = detectClientPlatform(sourceUrl);
    setDetectedPlatform(platform);

    const res = await importCreatorProfile(sourceUrl);
    if (res.success && res.persona) {
      setProfileData({
        platform: res.platform || platform || "unknown",
        creatorName: res.creatorName || "Creator",
        avatarUrl: res.avatarUrl,
        followers: res.followers,
        category: res.category,
        persona: res.persona,
        confidence: res.confidence || 0,
      });
      setWorkspaceName(res.creatorName || "My Storefront");
      setStep("preview");
    } else {
      setError(res.error || "Could not analyze profile");
    }
    setLoading(false);
  }, [sourceUrl]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStep("generating");
    setStages([]);

    const res = await runCreatorGeneration(
      sourceUrl,
      workspaceName,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      "INR",
      "en",
    );

    setStages(res.stages ?? []);

    if (res.success && res.result) {
      setResult(res.result);
      if (res.goldenValidation) {
        setGoldenScore(res.goldenValidation.overallScore);
      }
      setStep("complete");
    } else {
      setError(res.error || "Generation failed. Please try again.");
      setStep("error");
    }
    setLoading(false);
  }, [sourceUrl, workspaceName]);

  const handleRetry = useCallback(() => {
    setError(null);
    setStep("import");
    setStages([]);
  }, []);

  const activeStages = stages.filter((s) => s.status !== "skipped");
  const completedStages = activeStages.filter((s) => s.status === "completed");
  const failedStages = activeStages.filter((s) => s.status === "failed");
  const hasFailure = failedStages.length > 0;
  const currentStageIndex = completedStages.length;
  const progress = activeStages.length > 0
    ? Math.round((completedStages.length / activeStages.length) * 100)
    : 0;

  const PlatformIcon = detectedPlatform && PLATFORM_ICONS[detectedPlatform]
    ? PLATFORM_ICONS[detectedPlatform]
    : Globe;

  return (
    <div className="min-h-screen bg-[var(--surface-root)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {step === "welcome" && (
          <div className="space-y-8 text-center">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-6 w-fit mx-auto">
              <Sparkles className="h-12 w-12 text-indigo-400" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-white">Welcome to CreatorStore</h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                We&apos;ll analyze your social presence, generate a personalized storefront,
                and set up everything you need to start selling in minutes.
              </p>
            </div>
            <div className="space-y-3 text-left">
              {[
                { icon: LinkIcon, text: "Connect your YouTube, Instagram, or any creator profile" },
                { icon: Sparkles, text: "AI generates your storefront — products, theme, pages & SEO" },
                { icon: Layout, text: "Customize everything with the drag-and-drop builder" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="rounded-lg bg-white/5 p-2 shrink-0">
                    <item.icon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <p className="text-sm text-zinc-300 pt-1.5">{item.text}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep("import")}
              className="btn-primary w-full py-3"
            >
              Get Started
            </button>
          </div>
        )}

        {step === "import" && (
          <div className="space-y-6">
            <button
              onClick={() => setStep("welcome")}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div>
              <h1 className="text-xl font-semibold text-white">Paste your creator URL</h1>
              <p className="mt-1 text-sm text-zinc-400">
                We&apos;ll analyze your profile and generate a storefront tailored to your brand.
              </p>
            </div>

            <div>
              <label htmlFor="onboarding-url" className="block text-xs font-medium text-zinc-400 mb-1.5">
                Social Profile URL
              </label>
              <div className="relative">
                <input
                  id="onboarding-url"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => {
                    setSourceUrl(e.target.value);
                    setDetectedPlatform(detectClientPlatform(e.target.value));
                  }}
                  placeholder="https://youtube.com/@creator"
                  className="admin-input text-sm py-2.5 pl-10 w-full"
                  autoFocus
                />
                <PlatformIcon className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                  detectedPlatform
                    ? PLATFORM_COLORS[detectedPlatform] || "text-zinc-400"
                    : "text-zinc-600",
                )} />
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

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!sourceUrl.trim() || loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                </span>
              ) : (
                "Analyze Profile"
              )}
            </button>
          </div>
        )}

        {step === "preview" && profileData && (
          <div className="space-y-6">
            <button
              onClick={() => setStep("import")}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300"
            >
              <ArrowLeft className="h-4 w-4" /> Change URL
            </button>

            <div>
              <h1 className="text-xl font-semibold text-white">Profile Detected</h1>
              <p className="mt-1 text-sm text-zinc-400">
                We found your profile. Review the details and we&apos;ll generate your storefront.
              </p>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white shrink-0">
                  {profileData.creatorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{profileData.creatorName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <PlatformIcon className={cn(
                      "h-3.5 w-3.5",
                      PLATFORM_COLORS[profileData.platform] || "text-zinc-400",
                    )} />
                    <span className="text-xs text-zinc-500 capitalize">{profileData.platform}</span>
                    {profileData.followers !== undefined && profileData.followers > 0 && (
                      <>
                        <span className="text-zinc-700">·</span>
                        <span className="text-xs text-zinc-500">
                          {profileData.followers.toLocaleString()} followers
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {profileData.category && (
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Category</p>
                    <p className="text-sm text-zinc-300 mt-0.5 capitalize">{profileData.category}</p>
                  </div>
                )}
                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Persona</p>
                  <p className="text-sm text-zinc-300 mt-0.5">{profileData.persona.name}</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Confidence</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.round(profileData.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400">{Math.round(profileData.confidence * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="workspace-name" className="block text-xs font-medium text-zinc-400 mb-1.5">
                Storefront Name
              </label>
              <input
                id="workspace-name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="My Storefront"
                className="admin-input text-sm py-2.5 w-full"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !workspaceName.trim()}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                </span>
              ) : (
                "Generate My Storefront"
              )}
            </button>
          </div>
        )}

        {step === "generating" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-white">Building your storefront</h1>
              <p className="mt-1 text-sm text-zinc-400">
                AI is analyzing your profile, generating content, and setting up your workspace.
              </p>
            </div>

            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-1">
              {["profile_import", "generation", "provisioning", "builder_init", "publishing"].map((stageKey) => {
                const stage = stages.find((s) => s.stage === stageKey);
                const stageIndex = stages.findIndex((s) => s.stage === stageKey);
                const isCurrent = stageIndex === currentStageIndex;
                const isCompleted = stage?.status === "completed";
                const isFailed = stage?.status === "failed";
                const isPending = !stage && stageKey !== stages[0]?.stage;

                return (
                  <div
                    key={stageKey}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 transition-all",
                      isCompleted && "text-zinc-300",
                      isCurrent && !isCompleted && "bg-white/[0.03]",
                      isFailed && "bg-red-500/5",
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : isFailed ? (
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 text-indigo-400 animate-spin shrink-0" />
                    ) : (
                      <div className={cn(
                        "h-4 w-4 rounded-full border shrink-0",
                        isPending ? "border-zinc-700" : "border-zinc-600",
                      )} />
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
                <p className="text-sm text-red-400 font-medium">Some steps had issues</p>
                <p className="text-xs text-zinc-400 mt-1">
                  We&apos;ll proceed with what we have. You can fix things later in the builder.
                </p>
              </div>
            )}
          </div>
        )}

        {step === "complete" && (
          <div className="text-center space-y-6">
            <div className="rounded-full bg-emerald-500/20 p-4 w-fit mx-auto">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Your storefront is ready!</h1>
              <p className="text-zinc-400 mt-2 text-sm">
                AI has generated your personalized storefront. You can customize everything in the builder.
              </p>
            </div>

            {goldenScore !== null && (
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Generation Quality</span>
                  <span className={cn(
                    "text-sm font-medium",
                    goldenScore >= 0.8 ? "text-emerald-400" : goldenScore >= 0.5 ? "text-amber-400" : "text-red-400",
                  )}>
                    {Math.round(goldenScore * 100)}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      goldenScore >= 0.8 ? "bg-emerald-500" : goldenScore >= 0.5 ? "bg-amber-500" : "bg-red-500",
                    )}
                    style={{ width: `${Math.round(goldenScore * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => router.push(result?.dashboardUrl ?? "/builder")}
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
                  <Globe className="h-4 w-4" /> View Storefront
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
              <p className="text-zinc-400 mt-2 text-sm">{error || "Could not generate your storefront."}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleGenerate}
                className="btn-primary w-full py-3"
              >
                Try Again
              </button>
              <button
                onClick={handleRetry}
                className="btn-secondary w-full py-3"
              >
                Change Settings
              </button>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
              >
                Go to Dashboard instead
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
