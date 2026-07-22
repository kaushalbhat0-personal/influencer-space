"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Stepper,
  TemplateCard,
  StrategyCard,
  ScoreRing,
  ChecklistGrid,
  RecommendationCard,
  SectionToggleGrid,
  DeploymentCard,
  DevicePreview,
  WizardStep,
} from "@/components/ai";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MotionDiv, MotionPresence } from "@/components/ui/MotionSafe";
import { generateWebsite } from "@/actions/generate-website.action";
import { PageHeader } from "@/components/layout/PageHeader";
import type { StepperStep, StrategyOption, ChecklistItem, SectionToggle, DeploymentStep } from "@/components/ai";
import type { WebsiteGenerationResult } from "@/lib/ai-generation/types";
import {
  ShoppingBag, Camera, Gamepad2, Music, Dumbbell,
  Package, Building2, User, Sparkles, CheckCircle2
} from "lucide-react";

type FlowStep = "template" | "strategy" | "url" | "analyzing" | "report" | "preview" | "provisioning" | "done";

const TEMPLATES = [
  { id: "portfolio", label: "Creator Portfolio", description: "Gallery, timeline, blog — showcase your work", icon: Camera },
  { id: "store", label: "Creator Store", description: "Products, orders, payments — sell directly", icon: ShoppingBag },
  { id: "gaming", label: "Gaming Creator", description: "Games, gallery, links — gaming hub", icon: Gamepad2 },
  { id: "music", label: "Music Artist", description: "Gallery, products, links — music presence", icon: Music },
  { id: "fitness", label: "Fitness Coach", description: "Products, courses, timeline — fitness brand", icon: Dumbbell },
  { id: "digital", label: "Digital Products", description: "Downloads, products, memberships", icon: Package },
  { id: "agency", label: "Agency", description: "Portfolio, clients, testimonials", icon: Building2 },
  { id: "personal", label: "Personal Brand", description: "Timeline, blog, links — your story", icon: User },
];

const STRATEGIES: StrategyOption[] = [
  {
    id: "fast", label: "Fast", description: "Uses detected data only. No AI copywriting. Best for quick previews.", timeEstimate: "30 sec",
    includes: ["Profile data", "Theme", "Section structure", "Basic SEO"],
    excludes: ["AI copywriting", "Product descriptions", "Brand voice"],
  },
  {
    id: "balanced", label: "Balanced", description: "AI copywriting. Improves SEO. Creates hero. Best for most creators.", timeEstimate: "~1 min",
    recommended: true,
    includes: ["Everything in Fast", "Hero copy", "About section", "CTA text", "SEO metadata", "Tagline"],
    excludes: ["Full content rewrite", "Custom product copy"],
  },
  {
    id: "premium", label: "Premium", description: "AI rewrites everything. SEO optimized. Brand voice. Product copy.", timeEstimate: "2-3 min",
    includes: ["Everything in Balanced", "Full content rewrite", "Product descriptions", "Brand voice", "Suggested CTAs", "FAQ"],
    excludes: [],
  },
];

const DEFAULT_SECTIONS: SectionToggle[] = [
  { id: "hero", label: "Hero", enabled: true }, { id: "about", label: "About", enabled: true },
  { id: "products", label: "Products", enabled: true }, { id: "gallery", label: "Gallery", enabled: true },
  { id: "timeline", label: "Timeline", enabled: true }, { id: "links", label: "Links", enabled: true },
  { id: "faq", label: "FAQ", enabled: false }, { id: "blog", label: "Blog", enabled: false },
  { id: "newsletter", label: "Newsletter", enabled: false }, { id: "contact", label: "Contact", enabled: true },
];

function flowSteps(step: FlowStep): StepperStep[] {
  const steps: { id: FlowStep; label: string }[] = [
    { id: "template", label: "Template" }, { id: "strategy", label: "Strategy" },
    { id: "url", label: "URL" }, { id: "analyzing", label: "Analyze" },
    { id: "report", label: "Report" }, { id: "preview", label: "Preview" },
    { id: "provisioning", label: "Deploy" }, { id: "done", label: "Done" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return steps.map((s, i) => ({
    id: s.id,
    label: s.label,
    status: i < idx ? "completed" : i === idx ? "active" : "pending",
  }));
}

export default function GeneratePage() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>("template");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [strategyId, setStrategyId] = useState<string>("balanced");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [result, setResult] = useState<WebsiteGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStep = useCallback((next: FlowStep) => {
    setStep(next);
    setError(null);
    window.scrollTo(0, 0);
  }, []);

  const handleGenerate = useCallback(async () => {
    setStep("analyzing");
    setLoading(true);
    setError(null);

    try {
      const response = await generateWebsite({
        source: sourceUrl,
        strategy: strategyId as "fast" | "balanced" | "premium",
        skipAI: strategyId === "fast",
        sections: sections.filter((s) => s.enabled).map((s) => s.id),
      });

      if (!response.success || !response.data) {
        setError(response.error ?? "Generation failed");
        setStep("url");
        return;
      }

      setResult(response.data);

      if (response.data.success) {
        setStep("report");
      } else {
        setStep("url");
        setError(response.data.errors.join(", "));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setStep("url");
    } finally {
      setLoading(false);
    }
  }, [sourceUrl, strategyId, sections]);

  const reportChecklist: ChecklistItem[] = result
    ? [
        { id: "brand", label: "Brand Name", status: "detected" },
        { id: "colors", label: "Brand Colors", status: "detected" },
        { id: "logo", label: "Logo / Avatar", status: "detected" },
        { id: "hero", label: "Hero Section", status: result.generatedContent ? "detected" : "missing" },
        { id: "gallery", label: "Gallery", status: "detected" },
        { id: "social", label: "Social Links", status: "detected" },
        { id: "seo", label: "SEO Metadata", status: result.generatedContent ? "detected" : "missing" },
        { id: "theme", label: "Theme", status: result.generatedTheme ? "detected" : "missing" },
        { id: "domain", label: "Custom Domain", status: "missing" },
        { id: "payments", label: "Payment Gateway", status: "missing" },
        { id: "email", label: "Contact Email", status: "missing" },
        { id: "privacy", label: "Privacy Policy", status: "missing" },
      ]
    : [];

  const completedStages = result?.stages.filter((s) => s.status === "completed").length ?? 0;
  const totalStages = result?.stages.length ?? 8;
  const reportScore = Math.round((completedStages / totalStages) * 100);

  const deploySteps: DeploymentStep[] = result
    ? result.stages.map((s) => ({
        id: s.stage,
        label: s.stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        status: s.status === "completed" ? "completed" as const
          : s.status === "failed" ? "failed" as const
          : s.status === "running" ? "running" as const
          : "pending" as const,
        durationMs: s.durationMs ?? undefined,
        error: s.error ?? undefined,
      }))
    : [];

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Creator Import"
          description="Import creators from YouTube, Demo Seeds or Manual setup and provision complete CreatorStore websites."
          breadcrumbs={[{ label: "Dashboard", href: "/super-admin" }, { label: "Creator Platform" }, { label: "Creator Import" }]}
        />
        <Stepper steps={flowSteps(step)} currentStep={step} size="compact" />

        <MotionPresence>
          {/* STEP 1: Template */}
          {step === "template" && (
            <MotionDiv key="template" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <WizardStep title="Select Template" description="What kind of website do you want to create?" stepNumber={1} totalSteps={8}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {TEMPLATES.map((t) => (
                    <TemplateCard key={t.id} {...t} selected={templateId === t.id} onClick={setTemplateId} />
                  ))}
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={() => templateId && nextStep("strategy")} disabled={!templateId}>
                    Continue →
                  </Button>
                </div>
              </WizardStep>
            </MotionDiv>
          )}

          {/* STEP 2: Strategy */}
          {step === "strategy" && (
            <MotionDiv key="strategy" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <WizardStep title="AI Strategy" description="How should AI build this website?" stepNumber={2} totalSteps={8}>
                <div className="space-y-3">
                  {STRATEGIES.map((s) => (
                    <StrategyCard key={s.id} option={s} selected={strategyId === s.id} onSelect={setStrategyId} />
                  ))}
                </div>
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => nextStep("template")}>← Back</Button>
                  <Button onClick={() => nextStep("url")}>Continue →</Button>
                </div>
              </WizardStep>
            </MotionDiv>
          )}

          {/* STEP 3: URL Input */}
          {step === "url" && (
            <MotionDiv key="url" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <WizardStep title="Paste Creator URL" description="YouTube, Instagram, or any creator profile link." stepNumber={3} totalSteps={8}>
                <div className="space-y-4">
                  <Input
                    placeholder="https://youtube.com/@creator"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">Supports: YouTube (@handle, /channel/), Instagram, TikTok</p>
                  {error && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</div>
                  )}
                </div>
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => nextStep("strategy")}>← Back</Button>
                  <Button onClick={handleGenerate} disabled={!sourceUrl || loading}>
                    {loading ? <LoadingSpinner size="sm" /> : "Generate Website →"}
                  </Button>
                </div>
              </WizardStep>
            </MotionDiv>
          )}

          {/* STEP 4: Analyzing */}
          {step === "analyzing" && (
            <MotionDiv key="analyzing" className="flex flex-col items-center justify-center py-24">
              <Sparkles className="h-8 w-8 text-s8ul-cyan animate-pulse mb-4" />
              <h2 className="text-xl font-semibold text-white">Analyzing Creator Profile</h2>
              <p className="text-sm text-zinc-500 mt-2">Detecting platform, extracting data, generating content...</p>
              <div className="mt-8">
                <LoadingSpinner size="lg" />
              </div>
            </MotionDiv>
          )}

          {/* STEP 5: Report */}
          {step === "report" && result && (
            <MotionDiv key="report" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="space-y-6">
                <div className="text-center">
                  <ScoreRing value={reportScore} size="lg" variant={reportScore >= 80 ? "success" : reportScore >= 50 ? "warning" : "danger"} label="Website Score" />
                  <p className="mt-2 text-sm text-zinc-400">{result.creatorName}</p>
                  <p className="text-xs text-zinc-600">{result.sourcePlatform}</p>
                </div>

                <ChecklistGrid items={reportChecklist} title="AI Analysis Results" />

                {reportScore < 100 && (
                  <RecommendationCard
                    message="Connect Razorpay before publishing to start accepting payments. Add your contact email so customers can reach you."
                    estimatedMinutes={3}
                    priority="high"
                  />
                )}

                <SectionToggleGrid
                  sections={sections}
                  onToggle={(id) => setSections((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)))}
                />

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => nextStep("url")}>← Back to URL</Button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleGenerate}>🔄 Regenerate</Button>
                    <Button onClick={() => nextStep("preview")}>Preview →</Button>
                  </div>
                </div>
              </div>
            </MotionDiv>
          )}

          {/* STEP 6: Preview */}
          {step === "preview" && result && (
            <MotionDiv key="preview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <WizardStep title="Website Preview" description="See how your site looks before deploying." stepNumber={6} totalSteps={8}>
                <DevicePreview defaultDevice="mobile">
                  <div className="p-6 space-y-4">
                    <div className="h-8 rounded bg-s8ul-cyan/20 flex items-center px-3">
                      <span className="text-xs text-s8ul-cyan">{result.generatedContent?.heroTitle ?? "Welcome"}</span>
                    </div>
                    <div className="h-24 rounded bg-white/5" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-16 rounded bg-white/5" />
                      <div className="h-16 rounded bg-white/5" />
                    </div>
                    <div className="h-12 rounded bg-white/5" />
                  </div>
                </DevicePreview>
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => nextStep("report")}>← Back</Button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleGenerate}>🔄 Regenerate</Button>
                    <Button onClick={() => nextStep("provisioning")}>Deploy Website →</Button>
                  </div>
                </div>
              </WizardStep>
            </MotionDiv>
          )}

          {/* STEP 7: Provisioning */}
          {step === "provisioning" && (
            <MotionDiv key="provisioning" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <DeploymentCard
                subtitle={result?.storefrontUrl ?? undefined}
                steps={deploySteps.length > 0 ? deploySteps : [
                  { id: "tenant", label: "Creating Tenant", status: "completed", durationMs: 1200 },
                  { id: "db", label: "Creating Database", status: "completed", durationMs: 800 },
                  { id: "theme", label: "Generating Theme", status: "completed", durationMs: 1500 },
                  { id: "pages", label: "Generating Pages", status: "completed", durationMs: 2100 },
                  { id: "content", label: "Generating Content", status: "completed", durationMs: 1800 },
                  { id: "dashboard", label: "Creating Dashboard", status: "completed", durationMs: 900 },
                  { id: "domain", label: "Creating Domain", status: "completed", durationMs: 600 },
                  { id: "finalize", label: "Finalizing", status: "completed", durationMs: 400 },
                ]}
              />
              <div className="flex justify-center mt-8">
                <Button onClick={() => nextStep("done")}>Continue →</Button>
              </div>
            </MotionDiv>
          )}

          {/* STEP 8: Done */}
          {step === "done" && result && (
            <MotionDiv key="done" className="text-center py-12 space-y-6">
              <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-white">🎉 Website is Ready!</h2>
                <p className="text-zinc-400 mt-2">{result.creatorName}</p>
              </div>

              <div className="admin-card p-6 space-y-3 max-w-md mx-auto">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Dashboard</span>
                  <span className="text-s8ul-cyan font-mono text-xs">{result.dashboardUrl ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Storefront</span>
                  <span className="text-s8ul-cyan font-mono text-xs">{result.storefrontUrl ?? "—"}</span>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => {
                  const url = `https://${result.storefrontUrl}`;
                  navigator.clipboard?.writeText(url);
                }}>
                  📋 Copy Link
                </Button>
                <Button variant="outline" onClick={() => router.push("/super-admin")}>
                  ← Back to Dashboard
                </Button>
              </div>
            </MotionDiv>
          )}
        </MotionPresence>
      </div>
    </div>
  );
}
