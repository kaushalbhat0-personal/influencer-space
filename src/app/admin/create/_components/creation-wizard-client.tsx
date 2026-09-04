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
  /** RCCF-68.2 — preselected template id validated server-side (?blueprint= handoff). */
  initialBlueprintId?: string | null;
}

type Step = "industry" | "style" | "review" | "generating" | "done";

export function CreationWizardClient({ industries, styles, blueprints, themes, initialBlueprintId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialBlueprintId ? "review" : "industry");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(initialBlueprintId ?? null);
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

  if (step === "industry") {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">What do you do?</h2>
        <p className="text-sm text-[var(--text-secondary)]">Choose your industry or profession. We&apos;ll recommend the best starting point.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {industries.map((ind) => (
            <button
              key={ind.id}
              onClick={() => { setSelectedIndustry(ind.id); setStep("style"); }}
              className={`rounded-xl border p-4 text-left transition-all hover:border-white/30 ${
                selectedIndustry === ind.id ? "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/50" : "border-white/10"
              }`}
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">{ind.displayName}</p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">{ind.description}</p>
              {ind.recommendedModules.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {ind.recommendedModules.slice(0, 3).map((m) => (
                    <span key={m} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">{m}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "style") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep("industry")} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">&larr; Back</button>
          <span className="text-xs text-[var(--text-muted)]">|</span>
          <span className="text-xs text-[var(--text-muted)]">{industryObj?.displayName}</span>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Choose your style</h2>
        <p className="text-sm text-[var(--text-secondary)]">Pick a visual style for your website.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {styles.map((st) => {
            const compatibleTheme = st.compatibleThemeIds.length > 0 ? themes.find((t) => t.id === st.compatibleThemeIds[0]) : null;
            return (
              <button
                key={st.id}
                onClick={() => { setSelectedStyle(st.id); setStep("review"); }}
                className={`rounded-xl border p-4 text-left transition-all hover:border-white/30 ${
                  selectedStyle === st.id ? "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/50" : "border-white/10"
                }`}
              >
                <p className="text-sm font-semibold text-[var(--text-primary)]">{st.displayName}</p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">{st.description}</p>
                {compatibleTheme && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: compatibleTheme.variants[0]?.tokens.colors.primary }} />
                    <span className="text-[10px] text-[var(--text-muted)]">{compatibleTheme.name}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <button onClick={() => setStep("style")} className="hover:text-[var(--text-primary)] transition-colors">&larr; Back</button>
          <span className="text-[var(--text-muted)]">|</span>
          <span>{industryObj?.displayName}</span>
          <span className="text-[var(--text-muted)]">/</span>
          <span>{styleObj?.displayName}</span>
        </div>

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Review your website</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {recommendation && (
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Recommended Template</h3>
                {recommendation.alternativeBlueprints.slice(0, 3).map((alt) => (
                  <div key={alt.blueprintId} className="mt-2 flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">{alt.blueprintName}</p>
                      <div className="flex gap-2 mt-0.5">
                        {alt.reasons.slice(0, 2).map((r, i) => (
                          <span key={i} className="text-[10px] text-emerald-400">&#10003; {r}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedBlueprint(alt.blueprintId)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                        selectedBlueprint === alt.blueprintId ? "bg-[var(--brand-primary)] text-[var(--text-primary)]" : "border border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}

            {bpObj && (
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{bpObj.name}</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{bpObj.pages.length} pages &middot; {bpObj.pages.reduce((s, p) => s + p.sections.length, 0)} sections</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {bpObj.pages.map((p) => <span key={p.id} className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">{p.name}</span>)}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Theme</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {themes.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTheme(t.id); setPreviewTheme(t.id); }}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                      (previewTheme ?? selectedTheme) === t.id ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10" : "border-white/10 hover:border-white/30"
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
                      <span className="text-[8px] text-[var(--text-muted)]">{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

                <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Live Preview</h3>
            {themeObj && resolvedTokens && (
              <>
                <div className="mb-3 flex gap-2">
                  <button
                    onClick={() => setDevice("desktop")}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      device === "desktop" ? "bg-[var(--surface-hover)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setDevice("tablet")}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      device === "tablet" ? "bg-[var(--surface-hover)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Tablet
                  </button>
                  <button
                    onClick={() => setDevice("mobile")}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      device === "mobile" ? "bg-[var(--surface-hover)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Mobile
                  </button>
                  <button
                    onClick={() => setVariant("light")}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      variant === "light" ? "bg-[var(--surface-hover)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setVariant("dark")}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      variant === "dark" ? "bg-[var(--surface-hover)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
                      <span className="rounded px-3 py-1.5 text-sm font-medium text-[var(--text-primary)]" style={{ backgroundColor: resolvedTokens.colors.primary }}>
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

        <div className="flex justify-end gap-3">
          <button onClick={() => setStep("style")} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Back
          </button>
          <button onClick={handleGenerate} className="rounded-lg bg-[var(--brand-primary)] px-6 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity">
            Build Website
          </button>
        </div>
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Building your website — analyzing your profile, composing your storefront, and writing your content.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900/30">
        <span className="text-2xl text-emerald-400">&#10003;</span>
      </div>
      <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">Website Created!</h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Your website has been generated. You can now customize it in the Builder.</p>
      <div className="mt-6 flex gap-3">
        <a href="/builder" className="rounded-lg bg-[var(--brand-primary)] px-6 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity">
          Open Builder
        </a>
        <a href={`/${industryObj?.slug ?? "demo"}`} className="rounded-lg border border-white/10 px-6 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          View Website
        </a>
      </div>
    </div>
  );
}
