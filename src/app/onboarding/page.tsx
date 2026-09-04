"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn, slugify } from "@/lib/utils";
import { importCreatorProfile, runCreatorGeneration, createGenerationSession, getGenerationSessionProgress, getActiveGenerationSession, markOnboardingComplete, retryPublish, createManualWebsite } from "@/actions/onboarding.actions";
import { getOnboardingPreview, seedOnboardingIntelligence } from "@/actions/onboarding-intelligence.actions";
import type { OnboardingPreview } from "@/modules/runtime-context";
import { useGenerationExperience } from "@/features/onboarding/use-generation-experience";
import { GenerationExperienceView } from "@/features/onboarding/components/generation-experience-view";
import { ConstructionPreview } from "@/features/onboarding/components/construction-preview";
import { ActivityFeedView } from "@/features/onboarding/components/activity-feed";
import { useConstructionSnapshot } from "@/features/onboarding/hooks/use-construction-snapshot";
import {
  CheckCircle2, Globe, AlertTriangle, Loader2, ArrowLeft,
  Video, MessageCircle, Link as LinkIcon,
  Sparkles, Layout, Globe as GlobeIcon, Map, Edit3,
} from "lucide-react";
import { getProvidersByCategory, type ImportProvider } from "@/lib/import-provider/registry";
import "@/lib/import-provider/providers";
import { ImportInputRenderer } from "@/components/onboarding/import-input-renderer";
import { OnboardingIntelligence } from "@/components/onboarding/OnboardingIntelligence";

type OnboardingStep = "welcome" | "import" | "preview" | "generating" | "complete" | "error";

interface ProfileData {
  platform: string;
  creatorName: string;
  avatarUrl?: string;
  followers?: number;
  category?: string;
  persona: { id: string; name: string };
  confidence: number;
  categoryConfidence?: number;
  categoryRequiresReview?: boolean;
  categoryAlternatives?: Array<{ niche: string; score: number }>;
  acquisition?: {
    platform: string;
    adapter: string;
    capabilities: string[];
    populatedFields: string[];
    missingFields: string[];
    warnings: string[];
  };
}

const CATEGORY_OPTIONS = [
  { value: "film", label: "Film & Entertainment" },
  { value: "celebrity", label: "Celebrity" },
  { value: "food", label: "Food & Cooking" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "gaming", label: "Gaming" },
  { value: "education", label: "Education" },
  { value: "fitness", label: "Fitness & Health" },
  { value: "music", label: "Music" },
  { value: "art", label: "Art & Design" },
  { value: "photography", label: "Photography" },
  { value: "travel", label: "Travel" },
  { value: "sports", label: "Sports" },
  { value: "comedy", label: "Comedy" },
  { value: "business", label: "Business & Agency" },
  { value: "technology", label: "Technology & SaaS" },
  { value: "restaurant", label: "Restaurant" },
  { value: "finance", label: "Finance" },
  { value: "news", label: "News & Media" },
  { value: "general", label: "General" },
];

interface SessionStage {
  type: string;
  status: string;
  label: string;
  error: string | null;
  duration: number | null;
}

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
  youtube: "text-[var(--color-danger)]",
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

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillUrl = params.get("url") || "";

  const [step, setStep] = useState<OnboardingStep>(prefillUrl ? "import" : "import");
  const [sourceUrl, setSourceUrl] = useState(prefillUrl);
  const [selectedProvider, setSelectedProvider] = useState<ImportProvider | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(
    prefillUrl ? detectClientPlatform(prefillUrl) : null,
  );
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [preview, setPreview] = useState<OnboardingPreview | null>(null);
  const [useGoals, setUseGoals] = useState(true);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, unknown>>({});
  const [categoryOverride, setCategoryOverride] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionStages, setSessionStages] = useState<SessionStage[]>([]);
  const [activity, setActivity] = useState<string[]>([]);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [estimatedRemainingMs, setEstimatedRemainingMs] = useState<number | null>(null);
  const [goldenScore, setGoldenScore] = useState<number | null>(null);
  const [retryInfo, setRetryInfo] = useState<{ tenantId: string } | null>(null);
  const [retryPublishing, setRetryPublishing] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    return () => clearPolling();
  }, [clearPolling]);

  // RCCF-LAUNCH-TRACK-03 Phase 8: refresh recovery — resume the latest in-flight
  // session so progress continues after a refresh (never restarts from stage 1).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const active = await getActiveGenerationSession();
      if (cancelled || !active.success || !active.sessionId || !active.data) return;
      setSessionId(active.sessionId);
      setStep("generating");
      setLoading(false);
      setSessionStages(active.data.stages ?? []);
      setProgressPercent(active.data.progressPercent ?? 0);
      const startTime = Date.now() - (active.data.elapsedMs ?? 0);
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTime), 1000);
      pollRef.current = setInterval(async () => {
        const result = await getGenerationSessionProgress(active.sessionId!);
        if (!result.success) return;
        setSessionStages(result.data.stages);
        setActivity((prev) => [...prev, ...(result.data.activity ?? []).filter((m) => !prev.includes(m))].slice(-20));
        if (result.data.progressPercent > 0) setProgressPercent((p) => Math.max(p, result.data.progressPercent));
        if (result.data.status === "completed") {
          clearPolling();
          
          setTimeout(() => router.replace("/admin/dashboard"), 400);
        }
        if (result.data.status === "failed") {
          clearPolling();
          setStep("error");
          setError("We couldn't finish building your storefront. Please try again.");
        }
      }, 1500);
    })();
    return () => { cancelled = true; };
  }, [clearPolling, router]);

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
        categoryConfidence: res.categoryConfidence,
        categoryRequiresReview: res.categoryRequiresReview,
        categoryAlternatives: res.categoryAlternatives,
        acquisition: res.acquisition,
      });
      setCategoryOverride(res.category || "general");
      setWorkspaceName(res.creatorName || "My Storefront");

      // RCCF-INTEGRATION-01 Phase 2: intelligence-first onboarding — compute the
      // knowledge score, recommended goal profile and top recommendations from
      // the imported profile before generation.
      const previewResult = await getOnboardingPreview({
        name: res.creatorName || "",
        bio: res.bio || "",
        category: res.category || "general",
        platform: res.platform || platform || "unknown",
        socialLinks: res.socialLinks || [],
      });
      if (previewResult.success && previewResult.data) {
        setPreview(previewResult.data);
        setQuestionAnswers({});
      }
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
    setSessionStages([]);
    setProgressPercent(0);
    setElapsedMs(0);

    try {
      const { sessionId: newSessionId, error: sessionErr } = await createGenerationSession(sourceUrl);

      if (sessionErr || !newSessionId) {
        setError(sessionErr || "We couldn't start the build. Please try again.");
        setStep("error");
        setLoading(false);
        return;
      }

      setSessionId(newSessionId);
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 1000);

      pollRef.current = setInterval(async () => {
        const result = await getGenerationSessionProgress(newSessionId);
        if (!result.success) return;

        setSessionStages(result.data.stages);
        setActivity((prev) => {
          const next = result.data.activity ?? [];
          if (result.data.status === "completed") next.push("Your website is ready!");
          return [...prev, ...next.filter((m) => !prev.includes(m))].slice(-20);
        });
        if (result.data.progressPercent > 0) {
          setProgressPercent((prev) => Math.max(prev, result.data.progressPercent));
        } else {
          setProgressPercent(result.data.progressPercent);
        }
        if (result.data.estimatedRemainingMs != null) {
          setEstimatedRemainingMs(result.data.estimatedRemainingMs);
        }

        if (result.data.status === "completed") {
          clearPolling();
          
          // RCCF-LAUNCH-TRACK-03: a brief success message so the user registers
          // completion before the page changes (~400ms, not an artificial delay).
          setTimeout(() => router.replace("/admin/dashboard"), 400);
        }
        if (result.data.status === "failed") {
          clearPolling();
          setStep("error");
          setError("We couldn't finish building your storefront. Please try again.");
        }
      }, 1500);

      const res = await runCreatorGeneration(
        sourceUrl, workspaceName,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        "INR", "en",
        undefined,
        newSessionId,
        categoryOverride || undefined,
        useGoals && preview ? preview.goalProfile.weights : undefined,
      );

      if (res.success && res.result) {
        clearPolling();
        if (res.goldenValidation) {
          setGoldenScore(res.goldenValidation.overallScore);
        }
        setProgressPercent(100);
        setActivity((prev) => [...prev, "Your website is ready!"].slice(-20));
        

        await markOnboardingComplete(res.result.tenantId);

        // RCCF-INTEGRATION-01 Phase 2: seed the accepted goal profile + quick
        // answers once the tenant exists (best-effort — never blocks generation).
        try {
          if (useGoals && preview) {
            const answers = Object.entries(questionAnswers)
              .filter(([, value]) => value !== undefined && value !== null && value !== "")
              .map(([fieldId, value]) => ({ fieldId, value }));
            await seedOnboardingIntelligence({
              goals: preview.goalProfile.weights,
              answers,
            });
          }
        } catch {
          // seeding is best-effort; the flow continues
        }

        try {
          await fetch("/api/auth/refresh-session", { method: "POST", credentials: "include" });
        } catch {
          // session refresh is best-effort; redirect will re-validate
        }

        // RCCF-LAUNCH-TRACK-03: brief success message before navigating.
        setTimeout(() => router.replace("/admin/dashboard"), 400);
      } else if (res.retryable && res.tenantId) {
        clearPolling();
        setRetryInfo({ tenantId: res.tenantId });
        setError(res.error || "Publishing failed. You can retry or continue to your dashboard.");
        setStep("error");
      } else {
        clearPolling();
        setError(res.error || "We couldn't build your storefront. Please try again.");
        setStep("error");
      }
    } catch (err) {
      clearPolling();
      setError(err instanceof Error ? err.message : "We couldn't build your storefront.");
      setStep("error");
    }
    setLoading(false);
  }, [sourceUrl, workspaceName, router, clearPolling, categoryOverride, preview, questionAnswers, useGoals]);

  const handleRetry = useCallback(() => {
    clearPolling();
    setError(null);
    setStep("import");
    setSessionStages([]);
    setProgressPercent(0);
    setElapsedMs(0);
  }, [clearPolling]);

  // RCCF-19 P1-M: "Build Manually" provisions a truthful blank manual website
  // (via createManualWebsite → canonical ProvisioningService + blueprint) and
  // refreshes the session so /admin becomes reachable.
  //
  // RCCF-71.4.1 P2: the continuation CTA ("Continue to Theme Selection") is now
  // the SINGLE trigger for this action — the provider card no longer
  // auto-provisions. Previously the card auto-fired provisioning AND the CTA
  // navigated to /admin/create on its own, so a click during the in-flight
  // provision hit the lifecycle before the session refresh (still
  // AUTHENTICATED, no tenantId) and middleware silently bounced /admin/create
  // back to /onboarding. Now the CTA is disabled while provisioning runs
  // (visible spinner + errors), and on success it performs a FULL document
  // navigation to /admin/create (Theme Selection) so the target route's
  // on-demand compile never aborts a client-side soft navigation.
  const handleBuildManually = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await createManualWebsite();
      if (res.success) {
        try {
          await fetch("/api/auth/refresh-session", { method: "POST", credentials: "include" });
        } catch { }
        window.location.href = "/admin/create";
      } else {
        setError(res.error || "We couldn't create your website. Please try again.");
      }
    } catch {
      setError("We couldn't create your website. Please try again.");
    }
    setLoading(false);
  }, []);

  const handleRetryPublish = useCallback(async () => {
    if (!retryInfo) return;
    setRetryPublishing(true);
    setError(null);
    try {
      const res = await retryPublish(retryInfo.tenantId);
      if (res.success) {
        try {
          await fetch("/api/auth/refresh-session", { method: "POST", credentials: "include" });
        } catch { }
        router.replace("/admin/dashboard");
      } else {
        setError(res.error || "Retry publishing failed");
      }
    } catch {
      setError("Retry publishing failed");
    }
    setRetryPublishing(false);
  }, [retryInfo, router]);

  const handleGoToDashboard = useCallback(async () => {
    if (retryInfo?.tenantId) {
      await markOnboardingComplete(retryInfo.tenantId);
    }
    try {
      await fetch("/api/auth/refresh-session", { method: "POST", credentials: "include" });
    } catch {
      // session refresh is best-effort; redirect will re-validate
    }
    router.replace("/admin/dashboard");
  }, [retryInfo, router]);

  const hasFailure = sessionStages.some((s) => s.status === "failed");

  const experience = useGenerationExperience({
    events: sessionStages,
    runtimeProgress: progressPercent,
    elapsedMs,
    estimatedRemainingMs,
    hasStarted: step === "generating",
    activity,
  });

  const PlatformIcon = detectedPlatform && PLATFORM_ICONS[detectedPlatform]
    ? PLATFORM_ICONS[detectedPlatform]
    : Globe;

  const construction = useConstructionSnapshot({
    sessionId: sessionId ?? undefined,
    refreshKey: experience.currentId,
    enabled: step === "generating" && !!sessionId,
  });

  return (
    <div className="min-h-screen bg-[var(--surface-root)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-6xl">
        {step === "import" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">Build your CreatorStore</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Choose how you&apos;d like to start. Nothing is permanent — you can always import more later.
              </p>
            </div>

            {Array.from(getProvidersByCategory().entries()).map(([category, providers]) => (
              <div key={category} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {category === "import" ? "Import Existing Presence" : category === "ai" ? "Create with AI" : "Start Fresh"}
                </p>
                <div className="grid gap-2">
                  {providers.map((p: ImportProvider) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProvider(p);
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-[var(--radius-card)] border p-3 text-left w-full transition-all",
                        selectedProvider?.id === p.id
                          ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10"
                          : "border-[var(--border)] bg-[var(--surface-card)] hover:border-[var(--border-strong)]"
                      )}
                    >
                      <div className="shrink-0 h-8 w-8 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center">
                        {category === "import" ? <GlobeIcon className="h-4 w-4 text-[var(--brand-primary)]" /> : category === "ai" ? <Sparkles className="h-4 w-4 text-[var(--color-warning)]" /> : <Edit3 className="h-4 w-4 text-[var(--color-success)]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-[var(--text-primary)]">{p.label}</p>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">{p.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-center text-[11px] text-[var(--text-muted)] leading-relaxed">
              You can always connect more profiles later from Settings.<br />
              Your website is fully editable after generation.
            </p>

            {selectedProvider && selectedProvider.inputType !== "none" && (
              <ImportInputRenderer
                provider={selectedProvider}
                loading={loading}
                onSubmit={(data) => {
                  setSourceUrl(data.sourceUrl);
                  if (data.name) setWorkspaceName(data.name);
                  handleAnalyze();
                }}
              />
            )}

            {selectedProvider && selectedProvider.inputType === "none" && (
              <div className="space-y-4">
                <p className="text-lg font-semibold text-[var(--text-primary)]">{selectedProvider.title}</p>
                <p className="text-sm text-[var(--text-secondary)]">{selectedProvider.subtitle}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{selectedProvider.estimatedTime}</p>
                <button
                  onClick={handleBuildManually}
                  disabled={loading}
                  className="btn-primary w-full py-3 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Preparing your website…
                    </span>
                  ) : (
                    "Continue to Theme Selection"
                  )}
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-[var(--color-danger-surface)] border border-[var(--color-danger-border)] p-3">
                <p className="text-xs text-[var(--color-danger)]">{error}</p>
              </div>
            )}
          </div>
        )}

        {step === "preview" && profileData && (
          <div className="space-y-6">
            <button
              onClick={() => setStep("import")}
              className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-zinc-300"
            >
              <ArrowLeft className="h-4 w-4" /> Change URL
            </button>

            <div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">Profile Detected</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                We found your profile. Review the details and we&apos;ll generate your storefront.
              </p>
            </div>

            {profileData.acquisition && (
              <p
                className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]"
                data-testid="acquisition-status"
                aria-label={`Profile acquisition: ${profileData.acquisition.platform} via ${profileData.acquisition.adapter}`}
              >
                {profileData.acquisition.platform} Â· adapter: {profileData.acquisition.adapter}
                {profileData.acquisition.populatedFields.length > 0 && (
                  <> Â· data: {profileData.acquisition.populatedFields.join(", ")}</>
                )}
              </p>
            )}

            <div className="rounded-[var(--radius-card)] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-lg font-bold text-[var(--text-primary)] shrink-0">
                  {profileData.creatorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] font-medium truncate">{profileData.creatorName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <PlatformIcon className={cn(
                      "h-3.5 w-3.5",
                      PLATFORM_COLORS[profileData.platform] || "text-[var(--text-secondary)]",
                    )} />
                    <span className="text-xs text-[var(--text-muted)] capitalize">{profileData.platform}</span>
                    {profileData.followers !== undefined && profileData.followers > 0 && (
                      <>
                        <span className="text-[var(--text-muted)]">Â·</span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {profileData.followers.toLocaleString()} followers
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-lg bg-[var(--surface-card)] px-3 py-2">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Category</p>
                  <select
                    value={categoryOverride || profileData.category || "general"}
                    onChange={(e) => setCategoryOverride(e.target.value)}
                    className="mt-1 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-input)] px-3 py-2 text-sm text-zinc-300 outline-none focus:border-[var(--border-focus)]"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  {profileData.categoryRequiresReview && (
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--color-warning)]">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      Detection confidence was low — review the category above.
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-[var(--surface-card)] px-3 py-2">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Persona</p>
                  <p className="text-sm text-zinc-300 mt-0.5">{profileData.persona.name}</p>
                </div>
                <div className="rounded-lg bg-[var(--surface-card)] px-3 py-2">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Profile Match</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-hover)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-success)]"
                        style={{ width: `${Math.round(profileData.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">{Math.round(profileData.confidence * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {preview && (
              <OnboardingIntelligence
                preview={preview}
                useGoals={useGoals}
                onToggleGoals={setUseGoals}
                questionAnswers={questionAnswers}
                onAnswer={(fieldId, value) => setQuestionAnswers((prev) => ({ ...prev, [fieldId]: value }))}
              />
            )}

            <div>
              <label htmlFor="workspace-name" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Building your storefront…
                </span>
              ) : (
                "Build My Storefront"
              )}
            </button>
          </div>
        )}

        {step === "generating" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <GenerationExperienceView experience={experience} />
              <ActivityFeedView experience={experience} snapshot={construction.snapshot} />
            </div>
            <ConstructionPreview
              experience={experience}
              snapshot={construction.snapshot}
              subdomain={workspaceName ? slugify(workspaceName) : "your-storefront"}
            />
          </div>
        )}

        {step === "complete" && (
          <div className="text-center space-y-6">
            <div className="rounded-full bg-[var(--color-success-surface)] p-4 w-fit mx-auto">
              <CheckCircle2 className="h-10 w-10 text-[var(--color-success)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Your storefront is ready!</h1>
              <p className="text-[var(--text-secondary)] mt-2 text-sm">
                Redirecting you to your dashboard...
              </p>
            </div>

            {goldenScore !== null && (
              <div className="rounded-[var(--radius-card)] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Quality Check</span>
                  <span className={cn(
                    "text-sm font-medium",
                    goldenScore >= 0.8 ? "text-[var(--color-success)]" : goldenScore >= 0.5 ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]",
                  )}>
                    {Math.round(goldenScore * 100)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--surface-hover)]">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      goldenScore >= 0.8 ? "bg-[var(--color-success)]" : goldenScore >= 0.5 ? "bg-amber-500" : "bg-red-500",
                    )}
                    style={{ width: `${Math.round(goldenScore * 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 text-left text-xs text-[var(--text-muted)]">
                  {goldenScore >= 0.8 && <p>Your storefront was generated with high confidence. The content, structure, and branding closely match your creator identity.</p>}
                  {goldenScore >= 0.5 && goldenScore < 0.8 && <p>Your storefront is ready. You may want to review the generated content and make adjustments in the builder to better match your brand.</p>}
                  {goldenScore < 0.5 && <p>Your storefront was generated with limited data. Review and customize your content in the builder to ensure it reflects your brand.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {step === "error" && (
          <div className="text-center space-y-6">
            <div className={cn(
              "rounded-full p-4 w-fit mx-auto",
              retryInfo ? "bg-amber-500/20" : "bg-red-500/20",
            )}>
              <AlertTriangle className={cn(
                "h-10 w-10",
                retryInfo ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]",
              )} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                {retryInfo ? "We couldn't publish your website" : "We couldn't build your storefront"}
              </h1>
              <p className="text-[var(--text-secondary)] mt-2 text-sm">{error || "Something went wrong while building your storefront."}</p>
              {retryInfo && (
                <p className="text-[var(--text-muted)] mt-3 text-xs">
                  Your storefront was created successfully. Publishing the live version failed.
                  You can retry or continue to the dashboard.
                </p>
              )}
            </div>
            <div className="space-y-3">
              {retryInfo ? (
                <>
                  <button
                    onClick={handleRetryPublish}
                    disabled={retryPublishing}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    {retryPublishing && (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    )}
                    {retryPublishing ? "Publishing..." : "Retry Publishing"}
                  </button>
                  <button
                    onClick={handleGoToDashboard}
                    className="btn-secondary w-full py-3"
                  >
                    Go to Dashboard
                  </button>
                </>
              ) : (
                <>
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
                    className="text-sm text-[var(--text-muted)] hover:text-zinc-300 underline underline-offset-2"
                  >
                    Go to Dashboard instead
                  </button>
                  <a
                    href="mailto:support@creatorspace.app?subject=Storefront%20generation%20help"
                    className="block text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline underline-offset-2"
                  >
                    Contact Support
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
