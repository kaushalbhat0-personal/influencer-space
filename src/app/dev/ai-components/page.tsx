"use client";

import { useState } from "react";
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
import type { StepperStep, StrategyOption, ChecklistItem, SectionToggle, DeploymentStep } from "@/components/ai";
import { ShoppingBag, Camera, Link2, Gamepad2, Palette } from "lucide-react";

const TEMPLATE_STEPS: StepperStep[] = [
  { id: "template", label: "Template", status: "completed" },
  { id: "strategy", label: "Strategy", status: "completed" },
  { id: "analyze", label: "Analyze", status: "active" },
  { id: "report", label: "Report", status: "pending" },
  { id: "preview", label: "Preview", status: "pending" },
  { id: "deploy", label: "Deploy", status: "pending" },
  { id: "wizard", label: "Setup", status: "pending" },
];

const STRATEGIES: StrategyOption[] = [
  {
    id: "fast",
    label: "Fast",
    description: "Uses detected data only. No AI copywriting. Best for quick previews.",
    timeEstimate: "30 sec",
    includes: ["Profile data", "Theme", "Section structure", "Basic SEO"],
    excludes: ["AI copywriting", "Product descriptions", "Brand voice"],
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "AI copywriting. Improves SEO. Creates hero copy. Best for most creators.",
    timeEstimate: "~1 min",
    recommended: true,
    includes: ["Everything in Fast", "Hero copy", "About section", "CTA text", "SEO metadata", "Tagline"],
    excludes: ["Full content rewrite", "Custom product copy"],
  },
  {
    id: "premium",
    label: "Premium",
    description: "AI rewrites everything. SEO optimized. Brand voice. Product copy. Best for premium launches.",
    timeEstimate: "2-3 min",
    includes: ["Everything in Balanced", "Full content rewrite", "Product descriptions", "Brand voice", "Suggested CTAs", "FAQ generation"],
    excludes: [],
  },
];

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: "brand", label: "Brand Name", status: "detected" },
  { id: "colors", label: "Brand Colors", status: "detected" },
  { id: "logo", label: "Logo / Avatar", status: "detected" },
  { id: "hero", label: "Hero Section", status: "detected" },
  { id: "gallery", label: "Gallery", status: "detected" },
  { id: "products", label: "Products", status: "detected" },
  { id: "social", label: "Social Links", status: "detected" },
  { id: "seo", label: "SEO Metadata", status: "detected" },
  { id: "theme", label: "Theme", status: "detected" },
  { id: "contact", label: "Contact Email", status: "missing" },
  { id: "domain", label: "Custom Domain", status: "missing" },
  { id: "payments", label: "Payment Gateway", status: "missing" },
  { id: "shipping", label: "Shipping Info", status: "warning" },
  { id: "privacy", label: "Privacy Policy", status: "missing" },
  { id: "tax", label: "Tax Information", status: "warning" },
  { id: "ogimage", label: "OG Image", status: "missing" },
];

const DEPLOY_STEPS: DeploymentStep[] = [
  { id: "tenant", label: "Creating Tenant", status: "completed", durationMs: 1200 },
  { id: "db", label: "Creating Database", status: "completed", durationMs: 800 },
  { id: "theme", label: "Generating Theme", status: "completed", durationMs: 1500 },
  { id: "pages", label: "Generating Pages", status: "running" },
  { id: "content", label: "Generating Content", status: "pending" },
  { id: "dashboard", label: "Creating Dashboard", status: "pending" },
  { id: "domain", label: "Creating Domain", status: "pending" },
  { id: "finalize", label: "Finalizing", status: "pending" },
];

const INITIAL_SECTIONS: SectionToggle[] = [
  { id: "hero", label: "Hero", enabled: true },
  { id: "about", label: "About", enabled: true },
  { id: "products", label: "Products", enabled: true },
  { id: "gallery", label: "Gallery", enabled: true },
  { id: "timeline", label: "Timeline", enabled: true },
  { id: "links", label: "Links", enabled: true },
  { id: "faq", label: "FAQ", enabled: false },
  { id: "blog", label: "Blog", enabled: false },
  { id: "newsletter", label: "Newsletter", enabled: false },
  { id: "contact", label: "Contact", enabled: true },
];

export default function AIComponentsDemo() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>("balanced");
  const [sections, setSections] = useState(INITIAL_SECTIONS);

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-4 md:p-8 space-y-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Components</h1>
        <p className="text-sm text-zinc-500">Reusable infrastructure for the AI generation flow</p>
      </div>

      {/* Stepper */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Stepper</h2>
        <div className="admin-card p-6 space-y-8">
          <div>
            <p className="text-xs text-zinc-500 mb-3">Horizontal (default)</p>
            <Stepper steps={TEMPLATE_STEPS} currentStep="analyze" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-3">Vertical</p>
            <Stepper steps={TEMPLATE_STEPS.slice(0, 4)} orientation="vertical" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-3">Compact</p>
            <Stepper steps={TEMPLATE_STEPS} size="compact" />
          </div>
        </div>
      </section>

      {/* Template Cards */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">TemplateCard</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: "portfolio", label: "Creator Portfolio", desc: "Gallery, timeline, blog", icon: Camera },
            { id: "store", label: "Creator Store", desc: "Products, orders, payments", icon: ShoppingBag },
            { id: "gaming", label: "Gaming Creator", desc: "Games, gallery, links", icon: Gamepad2 },
            { id: "links", label: "Link in Bio", desc: "All your links", icon: Link2 },
          ].map((t) => (
            <TemplateCard
              key={t.id}
              id={t.id}
              label={t.label}
              description={t.desc}
              icon={t.icon}
              selected={selectedTemplate === t.id}
              onClick={(id) => setSelectedTemplate(id)}
            />
          ))}
        </div>
      </section>

      {/* Strategy Cards */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">StrategyCard</h2>
        <div className="space-y-3">
          {STRATEGIES.map((s) => (
            <StrategyCard
              key={s.id}
              option={s}
              selected={selectedStrategy === s.id}
              onSelect={setSelectedStrategy}
            />
          ))}
        </div>
      </section>

      {/* ScoreRing */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">ScoreRing</h2>
        <div className="admin-card p-6 flex flex-wrap items-center justify-center gap-8">
          <ScoreRing value={92} size="lg" variant="success" label="Website Score" />
          <ScoreRing value={58} size="md" variant="warning" label="SEO Score" />
          <ScoreRing value={24} size="sm" variant="danger" label="Domain" />
        </div>
      </section>

      {/* ChecklistGrid */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">ChecklistGrid</h2>
        <div className="admin-card p-6">
          <ChecklistGrid items={CHECKLIST_ITEMS} title="AI Analysis Results" />
        </div>
      </section>

      {/* RecommendationCard */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">RecommendationCard</h2>
        <div className="space-y-3">
          <RecommendationCard
            message="Connect Razorpay before publishing to start accepting payments. Add your contact email so customers can reach you."
            estimatedMinutes={3}
            priority="high"
          />
          <RecommendationCard
            message="Consider adding a custom domain for better branding."
            estimatedMinutes={5}
            priority="medium"
          />
        </div>
      </section>

      {/* SectionToggleGrid */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">SectionToggleGrid</h2>
        <div className="admin-card p-6">
          <SectionToggleGrid
            sections={sections}
            onToggle={(id) =>
              setSections((prev) =>
                prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
              )
            }
          />
        </div>
      </section>

      {/* DeploymentCard */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">DeploymentCard</h2>
        <DeploymentCard
          subtitle="techcreator.creatorspace.app"
          steps={DEPLOY_STEPS}
          elapsedSeconds={5.6}
        />
      </section>

      {/* DevicePreview */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">DevicePreview</h2>
        <DevicePreview>
          <div className="p-8 text-center">
            <Palette className="h-8 w-8 mx-auto text-s8ul-cyan mb-3" />
            <p className="text-sm text-zinc-400">Preview content renders here</p>
          </div>
        </DevicePreview>
      </section>

      {/* WizardStep */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">WizardStep</h2>
        <WizardStep title="Branding" description="Set up your brand identity. This appears on your storefront." stepNumber={2} totalSteps={7}>
          <div className="space-y-4">
            <div className="h-10 rounded bg-white/5" />
            <div className="h-24 rounded bg-white/5" />
          </div>
        </WizardStep>
      </section>
    </div>
  );
}
