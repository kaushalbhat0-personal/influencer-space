"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  defaultState, saveOnboarding, loadOnboarding, clearOnboarding, trackOnboarding,
  CREATOR_STEPS, AGENCY_STEPS,
} from "@/lib/onboarding/types";
import type { OnboardingState, Persona } from "@/lib/onboarding/types";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Sparkles, ArrowLeft, ArrowRight, CheckCircle2, Globe, Palette,
  Wand2, Eye, Rocket, Users, Building2, Play, Camera,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const personaParam = (params.get("persona") || "creator") as Persona;
  const planParam = params.get("plan") || "creator_free";

  const [state, setState] = useState<OnboardingState>(() => {
    const saved = loadOnboarding();
    if (saved) return saved;
    return defaultState(personaParam, planParam);
  });

  const [loading, setLoading] = useState(false);
  const steps = state.persona === "creator" ? CREATOR_STEPS : AGENCY_STEPS;
  const step = steps[state.currentStepIndex]!;

  useEffect(() => { saveOnboarding(state); }, [state]);
  useEffect(() => { trackOnboarding("onboarding:started", { persona: state.persona }); }, []);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const next = useCallback(() => {
    trackOnboarding("onboarding:step:completed", { step, persona: state.persona });
    setState((s) => {
      const nextIdx = s.currentStepIndex + 1;
      if (nextIdx >= steps.length) {
        clearOnboarding();
        trackOnboarding("onboarding:completed", { persona: s.persona });
        return { ...s, currentStepIndex: nextIdx, completed: true };
      }
      return { ...s, currentStepIndex: nextIdx };
    });
  }, [step, state.persona, steps.length]);

  const back = useCallback(() => {
    setState((s) => ({
      ...s,
      currentStepIndex: Math.max(0, s.currentStepIndex - 1),
    }));
  }, []);

  const handleGeneration = useCallback(async () => {
    setLoading(true);
    trackOnboarding("onboarding:generation:started", { persona: state.persona });
    try {
      await new Promise((r) => setTimeout(r, 2000)); // Simulate AI pipeline
      update({
        generatedContent: { heroTitle: state.brandName || "Your Store", heroSubtitle: "Welcome to your creator website" },
        generatedTheme: { preset: "indigo", primaryColor: "#6366F1" },
        storefrontUrl: `${state.brandName.toLowerCase().replace(/\s+/g, "-")}.creatorspace.app`,
        dashboardUrl: "/admin/dashboard",
      });
      trackOnboarding("onboarding:generation:completed", { persona: state.persona });
    } catch {
      update({});
    } finally {
      setLoading(false);
    }
  }, [state.persona, state.brandName, update]);

  const handlePublish = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      trackOnboarding("onboarding:published", { persona: state.persona });
      next();
    } finally {
      setLoading(false);
    }
  }, [next]);

  const noAccess = !state.persona;
  if (noAccess) {
    return <div className="min-h-screen bg-[var(--surface-root)] flex items-center justify-center">
      <EmptyState title="No account found" description="Please sign up first." />
    </div>;
  }

  return (
    <div className="min-h-screen bg-[var(--surface-root)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        {step !== "welcome" && step !== "success" && (
          <div className="mb-8">
            <div className="flex items-center gap-1.5 mb-2">
              {steps.filter((s) => s !== "welcome" && s !== "success").map((_, i) => (
                <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors",
                  i < state.currentStepIndex - 1 ? "bg-indigo-500" : "bg-white/[0.06]"
                )} />
              ))}
            </div>
            <p className="text-xs text-zinc-500">Step {state.currentStepIndex} of {steps.length - 2}</p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center space-y-6">
            <div className="rounded-full bg-emerald-500/20 p-4 w-fit mx-auto">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Your website is live! 🎉</h1>
              <p className="text-zinc-400 mt-2">
                {state.storefrontUrl && <span className="text-indigo-400 font-mono text-sm">{state.storefrontUrl}</span>}
              </p>
            </div>
            <div className="space-y-3">
              <button onClick={() => { clearOnboarding(); router.push(state.dashboardUrl || "/admin/dashboard"); }} className="btn-primary w-full py-3">
                Go to Dashboard
              </button>
              {state.storefrontUrl && (
                <a href={`https://${state.storefrontUrl}`} target="_blank" rel="noopener" className="btn-secondary w-full py-3 inline-flex items-center justify-center gap-2">
                  <Globe className="h-4 w-4" /> View Website
                </a>
              )}
            </div>
          </div>
        )}

        {step === "welcome" && (
          <OnboardingStep onNext={next} title="Welcome" subtitle={state.persona === "creator" ? "Let's build your creator website in under 5 minutes." : "Let's set up your agency and get your first creator live."}>
            <div className="space-y-3">
              {[
                { icon: Globe, label: state.persona === "creator" ? "Connect your content" : "Set up your agency profile", time: "1 min" },
                { icon: Wand2, label: "AI generates your website", time: "2 min" },
                { icon: Eye, label: "Review and customize", time: "1 min" },
                { icon: Rocket, label: "Publish to the world", time: "1 min" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 p-4">
                  <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <p className="text-sm text-zinc-300 flex-1">{item.label}</p>
                  <span className="text-xs text-zinc-600">{item.time}</span>
                </div>
              ))}
            </div>
          </OnboardingStep>
        )}

        {step === "import" && (
          <OnboardingStep onNext={next} onBack={back} title="Import your content" subtitle="Connect a platform so AI can analyze your brand.">
            <div className="space-y-2">
              {[
                { id: "youtube", icon: Play, label: "YouTube", placeholder: "https://youtube.com/@yourchannel", color: "text-red-400", bg: "bg-red-500/10" },
                { id: "instagram", icon: Camera, label: "Instagram", placeholder: "https://instagram.com/yourprofile", color: "text-pink-400", bg: "bg-pink-500/10" },
                { id: "manual", icon: Globe, label: "Website URL", placeholder: "https://yourwebsite.com", color: "text-indigo-400", bg: "bg-indigo-500/10" },
                { id: "manual2", icon: Building2, label: "Manual setup", placeholder: "I'll set up manually", color: "text-zinc-400", bg: "bg-zinc-800" },
              ].map((src) => (
                <button
                  key={src.id}
                  onClick={() => { update({ sourceUrl: state.sourceUrl || src.placeholder }); next(); }}
                  className="w-full flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[var(--surface-base)]/50 p-4 text-left hover:border-white/[0.15] transition-all"
                >
                  <div className={`flex-shrink-0 h-9 w-9 rounded-lg ${src.bg} flex items-center justify-center`}>
                    <src.icon className={`h-4 w-4 ${src.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{src.label}</p>
                    <p className="text-xs text-zinc-600">{src.placeholder}</p>
                  </div>
                </button>
              ))}
            </div>
          </OnboardingStep>
        )}

        {step === "brand" && (
          <OnboardingStep onNext={next} onBack={back} title="Define your brand" subtitle="AI uses this to generate a personalized website.">
            <div className="space-y-4">
              {[
                { key: "brandName", label: "Brand Name", value: state.brandName, placeholder: "Your Creator Name" },
                { key: "category", label: "Category", value: state.category, placeholder: "e.g. Gaming, Education, Fitness" },
                { key: "bio", label: "Short Bio", value: state.bio, placeholder: "What do you create?" },
                { key: "brandTone", label: "Brand Tone", value: state.brandTone, placeholder: "e.g. Professional, Casual, Bold" },
                { key: "targetAudience", label: "Target Audience", value: state.targetAudience, placeholder: "Who watches your content?" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => update({ [f.key]: e.target.value } as Partial<OnboardingState>)}
                    className="admin-input text-sm py-2.5"
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Palette className="h-3.5 w-3.5" /> AI will generate your brand colors and typography based on these inputs.
              </div>
            </div>
          </OnboardingStep>
        )}

        {step === "generate" && (
          <OnboardingStep onNext={loading ? undefined : next} onBack={back} title="Generating your website" subtitle="AI is analyzing your brand and building your storefront.">
            <div className="space-y-4">
              {[
                "Analyzing your brand", "Extracting content", "Generating theme",
                "Building storefront", "Creating products", "Setting up checkout",
              ].map((label, i) => (
                <div key={label} className={cn("flex items-center gap-3 rounded-lg p-3 transition-all",
                  i < (loading ? 3 : 6) ? "text-zinc-300" : "text-zinc-700"
                )}>
                  {i < (loading ? 3 : 6) ? (
                    loading && i === 3 ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-zinc-700" />
                  )}
                  <span className="text-sm">{label}</span>
                </div>
              ))}

              <button
                onClick={handleGeneration}
                disabled={loading}
                className="btn-primary w-full py-3 mt-2"
              >
                {loading ? "Generating..." : "Generate Website"}
              </button>
            </div>
          </OnboardingStep>
        )}

        {step === "review" && (
          <OnboardingStep onNext={next} onBack={back} title="Review your website" subtitle="Your website is ready. Review before publishing.">
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-[var(--surface-base)]/50 p-4 space-y-3">
                {[
                  { label: "Sections", value: "Hero, Products, Gallery, Links" },
                  { label: "Theme", value: state.generatedTheme?.preset as string || "Indigo" },
                  { label: "SEO", value: "Optimized" },
                  { label: "Mobile", value: "Responsive" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-zinc-500">{row.label}</span>
                    <span className="text-zinc-300">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" /> You can customize everything after publishing.
              </div>
            </div>
          </OnboardingStep>
        )}

        {step === "publish" && (
          <OnboardingStep onNext={handlePublish} onBack={back} title="Ready to publish" subtitle="Your website goes live immediately." loading={loading}>
            <div className="space-y-3">
              {[
                { label: "Storefront URL", value: state.storefrontUrl || "generating..." },
                { label: "Status", value: "Draft → Published" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm py-2.5 px-4 rounded-lg bg-[var(--surface-base)]/30 border border-white/[0.06]">
                  <span className="text-zinc-500">{row.label}</span>
                  <span className="text-zinc-300 font-mono text-xs">{row.value}</span>
                </div>
              ))}
              <button onClick={handlePublish} disabled={loading} className="btn-ai w-full py-3 mt-2">
                {loading ? "Publishing..." : "Publish Website"}
              </button>
            </div>
          </OnboardingStep>
        )}

        {/* Agency-specific steps */}
        {step === "profile" && (
          <OnboardingStep onNext={next} onBack={back} title="Agency profile" subtitle="This appears on your agency dashboard and client reports.">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Agency Name</label>
                <input type="text" value={state.agencyName} onChange={(e) => update({ agencyName: e.target.value })} className="admin-input text-sm py-2.5" placeholder="Your Agency" />
              </div>
            </div>
          </OnboardingStep>
        )}

        {step === "invite" && (
          <OnboardingStep onNext={next} onBack={back} title="Invite your team" subtitle="Add team members now or skip and do it later.">
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 p-5 text-center">
                <Users className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">You can invite team members anytime from your agency dashboard.</p>
              </div>
              <button onClick={next} className="btn-secondary w-full py-3">Skip for now</button>
            </div>
          </OnboardingStep>
        )}

        {step === "create-creator" && (
          <OnboardingStep onNext={next} onBack={back} title="Create your first creator" subtitle="Enter a creator's details to generate their website.">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Creator Name</label>
                <input type="text" value={state.creatorName} onChange={(e) => update({ creatorName: e.target.value })} className="admin-input text-sm py-2.5" placeholder="Creator name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Creator URL (YouTube/Instagram)</label>
                <input type="text" value={state.creatorUrl} onChange={(e) => update({ creatorUrl: e.target.value })} className="admin-input text-sm py-2.5" placeholder="https://youtube.com/@creator" />
              </div>
            </div>
          </OnboardingStep>
        )}
      </div>
    </div>
  );
}

function OnboardingStep({
  children, onNext, onBack, title, subtitle, loading,
}: {
  children: React.ReactNode;
  onNext?: (() => void) | (() => Promise<void>);
  onBack?: () => void;
  title: string;
  subtitle: string;
  loading?: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        {onBack && (
          <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
      </div>
      {children}
      {onNext && title !== "Welcome" && title !== "Generating your website" && title !== "Ready to publish" && (
        <button onClick={onNext} disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
