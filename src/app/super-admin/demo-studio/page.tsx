"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { INDUSTRIES, type DemoIndustry } from "@/lib/demo/industries";
import { generateDemoWebsite } from "@/actions/demo.actions";
import { Sparkles, CheckCircle2, ArrowLeft, Play } from "lucide-react";

type Step = "industry" | "brand" | "generate" | "done";
const PROGRESS_STEPS: Step[] = ["industry", "brand", "generate"];

export default function DemoStudioPage() {
  const [step, setStep] = useState<Step>("industry");
  const [industry, setIndustry] = useState<DemoIndustry | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tenantId: string; storefront: string } | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!industry) return;
    setStep("generate");
    setLoading(true);
    try {
      const data = await generateDemoWebsite(industry.id);
      setResult({ tenantId: data.tenantId, storefront: data.storefrontUrl });
      setStep("done");
    } catch { setStep("brand"); } finally { setLoading(false); }
  }, [industry]);

  const selected = INDUSTRIES.find((i) => i.id === industry?.id);

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Demo Content Studio</h1>
        <p className="mt-1 text-sm text-zinc-400">Generate complete demo creator websites from industry presets.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {PROGRESS_STEPS.map((s, i) => {
          const stepIdx = PROGRESS_STEPS.indexOf(s);
          const currentIdx = step === "done" ? PROGRESS_STEPS.length : PROGRESS_STEPS.indexOf(step as Step);
          const completed = stepIdx < currentIdx;
          const active = stepIdx === currentIdx && step !== "done";
          return (
          <div key={s} className={cn("flex items-center gap-2", i > 0 && "flex-1")}>
            <div className={cn("flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
              completed ? "bg-emerald-500 text-white" :
              active ? "bg-indigo-500 text-white ring-2 ring-indigo-500/30" : "bg-white/[0.06] text-zinc-600"
            )}>
              {completed ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i > 0 && <div className={cn("flex-1 h-0.5 rounded-full", stepIdx < currentIdx ? "bg-emerald-500" : "bg-white/[0.06]")} />}
          </div>
        )})}
      </div>

      {/* Step 1: Industry Selection */}
      {step === "industry" && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Choose an industry</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.id}
                onClick={() => { setIndustry(ind); setStep("brand"); }}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-[var(--surface-base)]/50 p-5 hover:border-indigo-500/30 hover:bg-indigo-500/[0.04] transition-all text-center"
              >
                <span className="text-2xl">{ind.icon}</span>
                <span className="text-sm font-medium text-white">{ind.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Brand Configuration */}
      {step === "brand" && selected && (
        <div className="space-y-5">
          <div>
            <button onClick={() => setStep("industry")} className="text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mb-4">
              <ArrowLeft className="h-3.5 w-3.5" /> Change industry
            </button>
            <h2 className="text-lg font-semibold text-white">{selected.icon} {selected.name}</h2>
          </div>

          <div className="admin-card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Brand Name</label>
                <div className="admin-input text-sm py-2.5 text-zinc-300">{selected.name} Pro</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Tone</label>
                <div className="admin-input text-sm py-2.5 text-zinc-300">{selected.brand.tone}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Primary Color</label>
                <div className="flex items-center gap-2 admin-input text-sm py-2.5">
                  <span className="h-4 w-4 rounded" style={{ backgroundColor: selected.brand.primary }} />
                  <span className="text-zinc-300">{selected.brand.primary}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Secondary Color</label>
                <div className="flex items-center gap-2 admin-input text-sm py-2.5">
                  <span className="h-4 w-4 rounded" style={{ backgroundColor: selected.brand.secondary }} />
                  <span className="text-zinc-300">{selected.brand.secondary}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Content Preview</label>
              <div className="space-y-2 text-sm">
                <p><span className="text-zinc-500">Bio:</span> <span className="text-zinc-300">{selected.content.bio}</span></p>
                <p><span className="text-zinc-500">Hero:</span> <span className="text-white font-medium">{selected.content.hero}</span></p>
                <p><span className="text-zinc-500">Tagline:</span> <span className="text-zinc-300">{selected.content.tagline}</span></p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Products ({selected.products.length})</label>
              <div className="space-y-2">
                {selected.products.map((p) => (
                  <div key={p.name} className="flex justify-between items-center rounded-lg border border-white/[0.06] bg-[var(--surface-root)] px-3 py-2 text-sm">
                    <span className="text-zinc-300">{p.name}</span>
                    <span className="text-white font-medium">₹{p.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleGenerate} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" /> Generate Demo Website
          </button>
        </div>
      )}

      {/* Step 3: Generating */}
      {step === "generate" && (
        <div className="text-center py-16 space-y-6">
          <div className="animate-spin h-10 w-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-white">Generating Demo Website</h2>
            <p className="text-sm text-zinc-500 mt-2">Creating tenant, generating content, provisioning storefront...</p>
          </div>
          <div className="space-y-2 text-sm text-left max-w-xs mx-auto">
            {["Creating tenant", "Generating content", "Setting theme", "Adding products", "Publishing"].map((label, i) => (
              <div key={label} className={cn("flex items-center gap-2", i < (loading ? 2 : 5) ? "text-zinc-300" : "text-zinc-700")}>
                {i < (loading ? 2 : 5) ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <div className="h-4 w-4 rounded-full border border-zinc-700" />}
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && result && (
        <div className="text-center py-12 space-y-6">
          <div className="rounded-full bg-emerald-500/20 p-5 w-fit mx-auto">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Demo Website Generated!</h2>
            <p className="text-sm text-zinc-500 mt-1">
              <span className="text-indigo-400 font-mono">{result?.storefront}</span>
            </p>
          </div>
          <div className="admin-card p-4 text-left space-y-2 max-w-sm mx-auto">
            {[
              { label: "Industry", value: selected?.name },
              { label: "Demo ID", value: result?.tenantId },
              { label: "Products", value: `${selected?.products.length} generated` },
              { label: "Status", value: "Published (Demo)" },
            ].map((r) => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-zinc-500">{r.label}</span>
                <span className="text-zinc-300">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setStep("industry"); setIndustry(null); setResult(null); }} className="btn-secondary px-6 py-2.5 text-sm">
              Generate Another
            </button>
            <a href="/super-admin/tenants" className="btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2">
              <Play className="h-4 w-4" /> View All Demos
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
