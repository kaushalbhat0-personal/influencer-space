"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { recommendationEngine } from "@/lib/creation/recommendation/engine";
import { createWebsite } from "@/actions/create.actions";
import type { IndustryDefinition } from "@/lib/creation/industry/registry";
import type { StyleDefinition } from "@/lib/creation/style/registry";
import type { BlueprintDefinition } from "@/lib/blueprint/types";
import type { ThemeDefinition } from "@/lib/theme/types-new";

interface Props {
  industries: IndustryDefinition[];
  styles: StyleDefinition[];
  blueprints: BlueprintDefinition[];
  themes: ThemeDefinition[];
}

type Step = "industry" | "style" | "review" | "generating" | "done";

export function CreationWizardClient({ industries, styles, blueprints, themes }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("industry");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [variant, setVariant] = useState<"light" | "dark">("dark");

  const recommendation = useMemo(() => {
    if (!selectedIndustry && !selectedStyle) return null;
    return recommendationEngine.recommend({
      industryId: selectedIndustry ?? undefined,
      styleId: selectedStyle ?? undefined,
      capabilities: [],
    });
  }, [selectedIndustry, selectedStyle]);

  const industryObj = selectedIndustry ? industries.find((i) => i.id === selectedIndustry) : null;
  const styleObj = selectedStyle ? styles.find((s) => s.id === selectedStyle) : null;
  const bpObj = selectedBlueprint ? blueprints.find((b) => b.id === selectedBlueprint) : null;
  const themeObj = (previewTheme ?? selectedTheme) ? themes.find((t) => t.id === (previewTheme ?? selectedTheme)) : null;
  const resolvedTokens = themeObj?.variants.find((v) => v.mode === variant)?.tokens ?? themeObj?.variants[0]?.tokens;

  async function handleGenerate() {
    setStep("generating");
    try {
      const formData = new FormData();
      formData.set("blueprintId", selectedBlueprint ?? recommendation?.recommendedBlueprintId ?? "com.creatos.creator");
      formData.set("themeId", selectedTheme ?? recommendation?.recommendedThemeId ?? "com.creatos.neon-dark");
      const result = await createWebsite(formData);
      if (result.success) {
        router.push("/admin/website-ready");
      } else {
        setStep("review");
      }
    } catch {
      setStep("review");
    }
  }

  // ── Step: Industry Selection ──

  if (step === "industry") {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-white">What do you do?</h2>
        <p className="text-sm text-zinc-400">Choose your industry or profession. We&apos;ll recommend the best starting point.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {industries.map((ind) => (
            <button
              key={ind.id}
              onClick={() => { setSelectedIndustry(ind.id); setStep("style"); }}
              className={`rounded-xl border p-4 text-left transition-all hover:border-white/30 ${
                selectedIndustry === ind.id ? "border-s8ul-cyan ring-2 ring-s8ul-cyan/50" : "border-white/10"
              }`}
            >
              <p className="text-sm font-semibold text-white">{ind.displayName}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{ind.description}</p>
              {ind.recommendedModules.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {ind.recommendedModules.slice(0, 3).map((m) => (
                    <span key={m} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">{m}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step: Style Selection ──

  if (step === "style") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("industry")} className="text-xs text-zinc-500 hover:text-white transition-colors">&larr; Back</button>
          <span className="text-xs text-zinc-700">|</span>
          <span className="text-xs text-zinc-500">{industryObj?.displayName}</span>
        </div>
        <h2 className="text-lg font-semibold text-white">Choose your style</h2>
        <p className="text-sm text-zinc-400">Pick a visual style for your website.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {styles.map((st) => {
            const compatibleTheme = st.compatibleThemeIds.length > 0 ? themes.find((t) => t.id === st.compatibleThemeIds[0]) : null;
            return (
              <button
                key={st.id}
                onClick={() => { setSelectedStyle(st.id); setStep("review"); }}
                className={`rounded-xl border p-4 text-left transition-all hover:border-white/30 ${
                  selectedStyle === st.id ? "border-s8ul-cyan ring-2 ring-s8ul-cyan/50" : "border-white/10"
                }`}
              >
                <p className="text-sm font-semibold text-white">{st.displayName}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{st.description}</p>
                {compatibleTheme && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: compatibleTheme.variants[0]?.tokens.colors.primary }} />
                    <span className="text-[10px] text-zinc-500">{compatibleTheme.name}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step: Review & Preview ──

  if (step === "review") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <button onClick={() => setStep("style")} className="hover:text-white transition-colors">&larr; Back</button>
          <span className="text-zinc-700">|</span>
          <span>{industryObj?.displayName}</span>
          <span className="text-zinc-700">/</span>
          <span>{styleObj?.displayName}</span>
        </div>

        <h2 className="text-lg font-semibold text-white">Review your website</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {/* Recommendation */}
            {recommendation && (
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Recommended Template</h3>
                {recommendation.alternativeBlueprints.slice(0, 3).map((alt) => (
                  <div key={alt.blueprintId} className="mt-2 flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                    <div>
                      <p className="text-sm text-white">{alt.blueprintName}</p>
                      <div className="flex gap-2 mt-0.5">
                        {alt.reasons.slice(0, 2).map((r, i) => (
                          <span key={i} className="text-[10px] text-emerald-400">&#10003; {r}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedBlueprint(alt.blueprintId)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                        selectedBlueprint === alt.blueprintId ? "bg-s8ul-cyan text-black" : "border border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Blueprint details */}
            {bpObj && (
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{bpObj.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">{bpObj.pages.length} pages &middot; {bpObj.pages.reduce((s, p) => s + p.sections.length, 0)} sections</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {bpObj.pages.map((p) => <span key={p.id} className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{p.name}</span>)}
                </div>
              </div>
            )}

            {/* Theme selection */}
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Theme</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {themes.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTheme(t.id); setPreviewTheme(t.id); }}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                      (previewTheme ?? selectedTheme) === t.id ? "border-s8ul-cyan bg-s8ul-cyan/10" : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.variants[0]?.tokens.colors.primary }} />
                    {t.name}
                    {t.premium && <span className="text-[9px] text-amber-400">PRO</span>}
                  </button>
                ))}
              </div>
              {themeObj && (
                <div className="mt-3 grid grid-cols-5 gap-1">
                  {Object.entries(themeObj.variants[0]?.tokens.colors ?? {}).filter(([k]) => !["overlay"].includes(k)).map(([name, hex]) => (
                    <div key={name} className="flex flex-col items-center gap-0.5">
                      <span className="h-6 w-6 rounded border border-white/10" style={{ backgroundColor: hex }} />
                      <span className="text-[8px] text-zinc-600">{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live preview */}
                <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Live Preview</h3>
            {themeObj && resolvedTokens && (
              <>
                <div className="mb-3 flex gap-2">
                  <button
                    onClick={() => setDevice("desktop")}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      device === "desktop" ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setDevice("tablet")}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      device === "tablet" ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Tablet
                  </button>
                  <button
                    onClick={() => setDevice("mobile")}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      device === "mobile" ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Mobile
                  </button>
                  <button
                    onClick={() => setVariant("light")}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      variant === "light" ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setVariant("dark")}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      variant === "dark" ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Dark
                  </button>
                </div>
                <div
                  className="overflow-hidden rounded-lg border border-white/10 transition-all"
                  style={{
                    maxWidth: device === "mobile" ? 375 : device === "tablet" ? 768 : "100%",
                    margin: "0 auto",
                  }}
                >
                  <div
                    className="min-h-[300px] p-6"
                    style={{
                      backgroundColor: resolvedTokens.colors.background,
                      color: resolvedTokens.colors.textPrimary,
                      fontFamily: resolvedTokens.typography.bodyFont,
                    }}
                  >
                    <div
                      className="mb-4 text-2xl font-bold"
                      style={{ color: resolvedTokens.colors.textPrimary, fontFamily: resolvedTokens.typography.headingFont }}
                    >
                      {bpObj?.name ?? "Your Brand"}
                    </div>
                    <p style={{ color: resolvedTokens.colors.textSecondary }}>
                      {bpObj?.pages.length ?? 0} pages &middot; {bpObj?.pages.reduce((s, p) => s + p.sections.length, 0) ?? 0} sections
                    </p>
                    <div className="mt-4 flex gap-3">
                      <span className="rounded px-3 py-1.5 text-sm font-medium text-white" style={{ backgroundColor: resolvedTokens.colors.primary }}>
                        Get Started
                      </span>
                      <span className="rounded border px-3 py-1.5 text-sm font-medium" style={{ borderColor: resolvedTokens.colors.border, color: resolvedTokens.colors.textSecondary }}>
                        Learn More
                      </span>
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-lg p-4" style={{ backgroundColor: resolvedTokens.colors.surface }}>
                          <div className="mb-2 h-3 w-3 rounded-full" style={{ backgroundColor: resolvedTokens.colors.accent }} />
                          <div className="mb-1 h-3 w-20 rounded" style={{ backgroundColor: resolvedTokens.colors.surfaceSecondary }} />
                          <div className="h-2 w-16 rounded" style={{ backgroundColor: resolvedTokens.colors.surfaceSecondary }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Generate button */}
        <div className="flex justify-end gap-3">
          <button onClick={() => setStep("style")} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            Back
          </button>
          <button onClick={handleGenerate} className="rounded-lg bg-s8ul-cyan px-6 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity">
            Generate Website
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Generating ──

  if (step === "generating") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-s8ul-cyan border-t-transparent" />
        <p className="mt-4 text-sm text-zinc-400">Generating your website...</p>
      </div>
    );
  }

  // ── Step: Done ──

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900/30">
        <span className="text-2xl text-emerald-400">&#10003;</span>
      </div>
      <h2 className="mt-4 text-xl font-bold text-white">Website Created!</h2>
      <p className="mt-2 text-sm text-zinc-400">Your website has been generated. You can now customize it in the Builder.</p>
      <div className="mt-6 flex gap-3">
        <a href="/builder" className="rounded-lg bg-s8ul-cyan px-6 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity">
          Open Builder
        </a>
        <a href={`/${industryObj?.slug ?? "demo"}`} className="rounded-lg border border-white/10 px-6 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
          View Website
        </a>
      </div>
    </div>
  );
}
