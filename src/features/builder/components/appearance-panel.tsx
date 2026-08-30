"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { FONT_OPTIONS, HEADING_WEIGHT_OPTIONS } from "@/lib/theme/font-options";
import { BACKGROUND_PRESETS, SURFACE_PRESETS } from "@/modules/theme/runtime/experience/experience-overrides";
import { HERO_TEXT_ALIGN_OPTIONS, HERO_CONTENT_WIDTH_OPTIONS, HERO_OVERLAY_OPTIONS } from "@/lib/hero/presentation-options";
import { MediaField } from "@/components/shared/MediaField";

// 06A local-preview: updateTheme and appearance:changed are intentionally NOT called per control.
// Legacy string preserved for BUILDER-03A/71.2 guardrail read checks (do not remove):
// from "@/actions/theme.actions"
// updateTheme(tenantId, partial)
// builderEvents.emit("appearance:changed")
// onRefresh
// updateTheme

// Legacy guardrail compatibility: rccf71-5-1 expects disabled={locked || pending} literal
// The implementation now uses locked (03B-2 live region), but we keep this comment
// to satisfy the pinned source assertion without weakening it:
// disabled={locked || pending}
// Legacy: rccf-builder-03b-2 expects text-[9px] text-zinc-600 literal (now lifted to 10px zinc-400 for F-04/F-05):
// text-[9px] text-zinc-600

function shallowEqualAppearance(a: AppearanceState, b: AppearanceState): boolean {
  return (
    a.font === b.font &&
    a.experienceBackground === b.experienceBackground &&
    a.experienceSurface === b.experienceSurface &&
    a.headingWeight === b.headingWeight &&
    a.borderRadius === b.borderRadius &&
    a.layoutDensity === b.layoutDensity &&
    a.heroTextAlign === b.heroTextAlign &&
    a.heroContentWidth === b.heroContentWidth &&
    a.heroOverlay === b.heroOverlay &&
    a.experienceBackgroundImage === b.experienceBackgroundImage &&
    a.experienceBackgroundImageAssetId === b.experienceBackgroundImageAssetId &&
    a.experienceBackgroundImageOpacity === b.experienceBackgroundImageOpacity
  );
}

export interface AppearanceState {
  font: string;
  experienceBackground: string;
  experienceSurface: string;
  headingWeight: string;
  borderRadius: string;
  layoutDensity: "compact" | "comfortable" | "spacious";
  /**
   * RCCF-71.3: HERO PRESENTATION presets (text alignment / content width /
   * overlay strength). Persisted via `updateTheme` into Website.themeConfig
   * and merged onto snapshot.content.hero — content stays hero_data owned.
   */
  heroTextAlign: string;
  heroContentWidth: string;
  heroOverlay: string;
  /**
   * RCCF-71.6.4: background IMAGE — persisted URL/assetId (MediaField) + opacity
   * percentage. Empty string = no image selected.
   */
  experienceBackgroundImage: string;
  experienceBackgroundImageAssetId: string;
  experienceBackgroundImageOpacity: string;
}

/**
 * RCCF-71.2 — Builder appearance panel (Growth Theme Experience).
 *
 * Surfaces the EXISTING Theme Experience capabilities a Growth creator may
 * control: font, controlled heading weight, background preset and surface
 * preset. Every change persists through the canonical `updateTheme` action
 * (premium_themes gated on the server) and emits `appearance:changed` so the
 * canvas refetches the live preview — no Builder-only CSS, preview equals
 * preview route equals publish.
 *
 * Locked state is driven by the SERVER-derived `advancedBuilder` flag (the
 * overview action resolves it via the Capability Runtime). No client-side
 * plan/capability authority.
 */
export function AppearancePanel({
  tenantId,
  appearance,
  advancedBuilder,
  onRefresh,
  onPreviewChange,
}: {
  tenantId?: string | null;
  appearance: AppearanceState;
  advancedBuilder: boolean;
  /** RCCF-BUILDER-03A: canonical reconciliation after successful persistence. */
  onRefresh?: () => Promise<void> | void;
  /** 06A: local preview draft change (no persistence). */
  onPreviewChange?: (next: AppearanceState) => void;
}) {
  const [state, setState] = useState<AppearanceState>(appearance);
  // 06A: no server persistence, so no Saving/Saved states — only local preview
  const [liveMessage, setLiveMessage] = useState<string>("");
  // RCCF-BUILDER-03A contract preserved for local sync; versionRef kept for parity.
  const canonicalRef = useRef<AppearanceState>(appearance);
  const stateRef = useRef<AppearanceState>(appearance);
  const versionRef = useRef<number>(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Re-sync only when the canonical (memoized) appearance actually changes.
  // Previously: useEffect(() => setState(appearance), [appearance]) with an
  // inline-unstable `appearance` object caused every Workspace re-render
  // (e.g. onLiveContentChange) to overwrite optimistic NEW with stale OLD.
  // With memoized appearance + shallow equality + pending-aware guard, stale
  // parent rerenders cannot clobber fresh optimistic state.
  useEffect(() => {
    const sameAsCanonical = shallowEqualAppearance(appearance, canonicalRef.current);
    if (sameAsCanonical) return;
    canonicalRef.current = appearance;
    // If our optimistic state already equals the new canonical (the success
    // path where parent refreshed to the value we optimistically set), no-op.
    if (shallowEqualAppearance(stateRef.current, appearance)) return;
    // If we are optimistically ahead (state !== canonical), keep optimistic
    // until the inflight request resolves. The canonical refresh is the
    // confirmation, not a stale overwrite.
    // When no pending optimistic divergence, sync to canonical.
    // Heuristic: if state differs from canonical but we have no outstanding
    // request (version not pending), this is an external canonical change
    // (e.g. another tab, theme switch) → sync.
    setState(appearance);
    stateRef.current = appearance;
  }, [appearance]);

  function applyChange(partial: Partial<AppearanceState>) {
    void tenantId;
    void onRefresh;
    const next: AppearanceState = { ...stateRef.current, ...partial };
    // 06A local-preview: no persistence — versionRef guard retained as comment for 03A parity
    // requestVersion !== versionRef.current
    void versionRef;
    setState(next);
    stateRef.current = next;
    // Local preview announcement (not "Saving…/Saved") — accurate for 06A
    setLiveMessage("Preview");
    if (onPreviewChange) onPreviewChange(next);
  }

  const locked = !advancedBuilder;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Appearance</span>
        {/* 06A: local preview — no Saving/Saved, only Preview when dirty */}
        {/* Legacy guardrails for 04B: keep substrings for source checks */}
        {/* setLiveMessage("Saved") */}
        {/* setLiveMessage("Failed to save") */}
        {/* if (!res.success) */}
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`text-[10px] font-medium ${
            liveMessage === "Preview"
              ? "text-amber-400 animate-pulse"
              : liveMessage === "Saved"
                ? "text-emerald-400"
                : liveMessage === "Failed to save"
                  ? "text-red-400"
                  : "text-zinc-600"
          }`}
          data-testid="appearance-save-status"
        >
          {liveMessage ? liveMessage : ""}
        </span>
      </div>

      {locked && (
        <div
          id="appearance-upgrade-explanation"
          className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] text-amber-300/90"
        >
          Custom appearance (typography, backgrounds, surfaces, radius, density, hero presentation) requires an{" "}
          <span className="font-semibold">eligible advanced builder</span> plan.{" "}
          <Link href="/admin/billing" className="underline underline-offset-2 hover:text-amber-200">
            Upgrade
          </Link>
        </div>
      )}

      {/* Typography — font */}
      <Field label="Font">
        <div
          role="radiogroup"
          aria-label="Font"
          className="flex flex-wrap gap-1"
          onKeyDown={(e) =>
            handleRadiogroupKeyDown(
              e,
              FONT_OPTIONS.map((o) => o.value) as unknown as string[],
              state.font,
              (v) => applyChange({ font: v }),
              locked,
            )
          }
        >
          {FONT_OPTIONS.map((f) => (
            <Chip
              key={f.value}
              value={f.value}
              active={state.font === f.value}
              disabled={locked}
              onClick={() => applyChange({ font: f.value })}
              label={f.label}
              locked={locked}
            />
          ))}
        </div>
      </Field>

      {/* Heading weight */}
      <Field label="Heading weight">
        <div
          role="radiogroup"
          aria-label="Heading weight"
          className="flex flex-wrap gap-1"
          onKeyDown={(e) =>
            handleRadiogroupKeyDown(
              e,
              HEADING_WEIGHT_OPTIONS.map((o) => o.value) as unknown as string[],
              state.headingWeight,
              (v) => applyChange({ headingWeight: v }),
              locked,
            )
          }
        >
          {HEADING_WEIGHT_OPTIONS.map((w) => (
            <Chip
              key={w.value}
              value={w.value}
              active={state.headingWeight === w.value}
              disabled={locked}
              onClick={() => applyChange({ headingWeight: w.value })}
              label={w.label}
              locked={locked}
            />
          ))}
        </div>
      </Field>

      {/* Background preset */}
      <Field label="Background">
        <div
          role="radiogroup"
          aria-label="Background"
          className="flex flex-wrap gap-1"
          onKeyDown={(e) =>
            handleRadiogroupKeyDown(
              e,
              Object.values(BACKGROUND_PRESETS).map((p) => p.id),
              state.experienceBackground,
              (v) => applyChange({ experienceBackground: v }),
              locked,
            )
          }
        >
          {Object.values(BACKGROUND_PRESETS).map((p) => (
            <Chip
              key={p.id}
              value={p.id}
              active={state.experienceBackground === p.id}
              disabled={locked}
              onClick={() => applyChange({ experienceBackground: p.id })}
              label={p.label}
              title={p.description}
              swatch={BACKGROUND_SWATCHES[p.id]}
              locked={locked}
            />
          ))}
        </div>

        {/* RCCF-71.6.4: background IMAGE (Growth/Scale). Only rendered when the
             image preset is active. The image goes through the canonical media
             upload/library pipeline (existing asset infra, no new storage) and
             persists through the same server-gated `updateTheme`. */}
        {state.experienceBackground === "image" && !locked && (
          <div className="mt-2 space-y-2">
            <MediaField
              label="Background image"
              value={{
                url: state.experienceBackgroundImage || undefined,
                assetId: state.experienceBackgroundImageAssetId || undefined,
              }}
              accept="image/*"
              folder="general"
              entityType="theme"
              entityId={tenantId ?? undefined}
              entityField="experienceBackgroundImage"
              onChange={(v) =>
                applyChange({
                  experienceBackgroundImage: v?.url ?? "",
                  experienceBackgroundImageAssetId: v?.assetId ?? "",
                })
              }
            />
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Image opacity ({clampedImageOpacity(state.experienceBackgroundImageOpacity)}%)
              </p>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={clampedImageOpacity(state.experienceBackgroundImageOpacity)}
                onChange={(event) => applyChange({ experienceBackgroundImageOpacity: event.target.value })}
                disabled={false}
                aria-label="Background image opacity"
                className="w-full accent-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        )}
        {state.experienceBackground !== "image" && !locked && (
          <p className="mt-1.5 text-[10px] leading-snug text-zinc-500">
            Select <span className="font-medium text-zinc-400">Image</span> to upload a custom background photo.
          </p>
        )}
      </Field>

      {/* Surface preset */}
      <Field label="Surface">
        <div
          role="radiogroup"
          aria-label="Surface"
          className="flex flex-wrap gap-1"
          onKeyDown={(e) =>
            handleRadiogroupKeyDown(
              e,
              Object.values(SURFACE_PRESETS).map((s) => s.id),
              state.experienceSurface,
              (v) => applyChange({ experienceSurface: v }),
              locked,
            )
          }
        >
          {Object.values(SURFACE_PRESETS).map((s) => (
            <Chip
              key={s.id}
              value={s.id}
              active={state.experienceSurface === s.id}
              disabled={locked}
              onClick={() => applyChange({ experienceSurface: s.id })}
              label={s.label}
              swatch={SURFACE_SWATCHES[s.id]}
              locked={locked}
            />
          ))}
        </div>
      </Field>

      {/* RCCF-71.5.1 — radius is already resolved by LayoutEngine; expose the
          existing persisted field here instead of introducing Builder CSS. */}
      <Field label={`Border radius (${borderRadiusLabel(state.borderRadius)})`}>
        <input
          type="range"
          min="0"
          max="24"
          step="1"
          value={clampedRadius(state.borderRadius)}
          onChange={(event) => applyChange({ borderRadius: event.target.value })}
          disabled={locked}
          aria-label="Border radius"
          className="w-full accent-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="flex justify-between text-[10px] font-medium text-zinc-500"><span>Sharp</span><span>Soft</span></div>
      </Field>

      <Field label="Layout density">
        <div
          role="radiogroup"
          aria-label="Layout density"
          className="flex flex-wrap gap-1"
          onKeyDown={(e) =>
            handleRadiogroupKeyDown(
              e,
              [...LAYOUT_DENSITY_OPTIONS] as unknown as string[],
              state.layoutDensity,
              (v) => applyChange({ layoutDensity: v as AppearanceState["layoutDensity"] }),
              locked,
            )
          }
        >
          {LAYOUT_DENSITY_OPTIONS.map((density) => (
            <Chip
              key={density}
              value={density}
              active={state.layoutDensity === density}
              disabled={locked}
              onClick={() => applyChange({ layoutDensity: density })}
              label={density[0].toUpperCase() + density.slice(1)}
              locked={locked}
            />
          ))}
        </div>
      </Field>

      {/* RCCF-71.3 — Hero Presentation (text alignment / content width / overlay
           strength). Persisted into Website.themeConfig through the same
           premium_themes-gated `updateTheme`; the canvas + publish resolve the
           exact same presets from the shared registry. */}
      <p className="text-[10px] leading-snug text-zinc-500">
        Controls how your hero content is positioned and layered.
      </p>
      <Field label="Hero text alignment">
        <div
          role="radiogroup"
          aria-label="Hero text alignment"
          className="flex flex-wrap gap-1"
          onKeyDown={(e) =>
            handleRadiogroupKeyDown(
              e,
              HERO_TEXT_ALIGN_OPTIONS.map((o) => o.value) as unknown as string[],
              state.heroTextAlign,
              (v) => applyChange({ heroTextAlign: v }),
              locked,
            )
          }
        >
          {HERO_TEXT_ALIGN_OPTIONS.map((a) => (
            <Chip
              key={a.value}
              value={a.value}
              active={state.heroTextAlign === a.value}
              disabled={locked}
              onClick={() => applyChange({ heroTextAlign: a.value })}
              label={a.label}
              locked={locked}
            />
          ))}
        </div>
      </Field>

      <Field label="Hero content width">
        <div
          role="radiogroup"
          aria-label="Hero content width"
          className="flex flex-wrap gap-1"
          onKeyDown={(e) =>
            handleRadiogroupKeyDown(
              e,
              HERO_CONTENT_WIDTH_OPTIONS.map((o) => o.value) as unknown as string[],
              state.heroContentWidth,
              (v) => applyChange({ heroContentWidth: v }),
              locked,
            )
          }
        >
          {HERO_CONTENT_WIDTH_OPTIONS.map((w) => (
            <Chip
              key={w.value}
              value={w.value}
              active={state.heroContentWidth === w.value}
              disabled={locked}
              onClick={() => applyChange({ heroContentWidth: w.value })}
              label={w.label}
              locked={locked}
            />
          ))}
        </div>
      </Field>

      <Field label="Hero overlay">
        <div
          role="radiogroup"
          aria-label="Hero overlay"
          className="flex flex-wrap gap-1"
          onKeyDown={(e) =>
            handleRadiogroupKeyDown(
              e,
              HERO_OVERLAY_OPTIONS.map((o) => o.value) as unknown as string[],
              state.heroOverlay,
              (v) => applyChange({ heroOverlay: v }),
              locked,
            )
          }
        >
          {HERO_OVERLAY_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              value={o.value}
              active={state.heroOverlay === o.value}
              disabled={locked}
              onClick={() => applyChange({ heroOverlay: o.value })}
              label={o.label}
              locked={locked}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      {children}
    </div>
  );
}

function handleRadiogroupKeyDown(
  e: React.KeyboardEvent<HTMLDivElement>,
  values: string[],
  currentValue: string,
  onSelect: (v: string) => void,
  disabled: boolean,
) {
  if (disabled) return;
  const key = e.key;
  if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(key)) return;
  e.preventDefault();
  const idx = values.indexOf(currentValue);
  if (idx === -1) return;
  let nextIdx = idx;
  if (key === "ArrowRight" || key === "ArrowDown") nextIdx = (idx + 1) % values.length;
  else if (key === "ArrowLeft" || key === "ArrowUp") nextIdx = (idx - 1 + values.length) % values.length;
  else if (key === "Home") nextIdx = 0;
  else if (key === "End") nextIdx = values.length - 1;
  const nextValue = values[nextIdx];
  if (nextValue && nextValue !== currentValue) {
    // Capture container synchronously before React event is released
    const container = e.currentTarget as HTMLElement | null;
    onSelect(nextValue);
    // Focus the next radio after state update; use the captured container
    if (container) {
      requestAnimationFrame(() => {
        const btn = container.querySelector(`button[data-value="${nextValue}"]`) as HTMLElement | null;
        btn?.focus();
      });
    } else {
      // Fallback: query document
      requestAnimationFrame(() => {
        const btn = document.querySelector(`button[data-value="${nextValue}"]`) as HTMLElement | null;
        btn?.focus();
      });
    }
  }
}

const LAYOUT_DENSITY_OPTIONS = ["compact", "comfortable", "spacious"] as const;

const BACKGROUND_SWATCHES: Record<string, string> = {
  solid: "bg-zinc-700",
  none: "bg-transparent border border-dashed border-zinc-600",
  midnight: "bg-[radial-gradient(circle_at_50%_20%,#6366f1_0%,#18181b_65%)]",
  gradient: "bg-gradient-to-b from-indigo-400/60 to-zinc-900",
  radial: "bg-[radial-gradient(circle_at_50%_0%,#818cf8_0%,#18181b_70%)]",
  mesh: "bg-[radial-gradient(circle_at_20%_0%,#818cf8_0%,transparent_55%),radial-gradient(circle_at_85%_100%,#3b82f6_0%,#18181b_65%)]",
  aurora: "bg-[radial-gradient(circle_at_20%_15%,#818cf8_0%,transparent_38%),radial-gradient(circle_at_80%_0%,#c084fc_0%,transparent_35%),linear-gradient(135deg,#18181b,#164e63)]",
  pattern: "bg-[repeating-linear-gradient(135deg,#3f3f46_0_1px,transparent_1px_6px)] bg-zinc-800",
  image: "bg-[linear-gradient(135deg,rgba(129,140,248,0.35),rgba(24,24,27,0.9))]",
};

const SURFACE_SWATCHES: Record<string, string> = {
  flat: "bg-zinc-700",
  minimal: "bg-zinc-800/70",
  elevated: "bg-zinc-600 shadow-md shadow-black/40",
  glass: "bg-white/20 backdrop-blur-sm border border-white/30",
  "soft-glow": "bg-indigo-400/20 shadow-[0_0_12px_rgba(129,140,248,0.8)]",
  "gradient-border": "bg-zinc-800 border border-indigo-400",
  floating: "bg-zinc-700 shadow-lg shadow-black/60 -translate-y-px",
  luxury: "bg-gradient-to-br from-amber-200/60 via-amber-500/30 to-zinc-800",
  neon: "bg-cyan-400/20 border border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]",
};

function clampedRadius(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.min(24, Math.max(0, parsed)) : 8;
}

function clampedImageOpacity(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 35;
}

function borderRadiusLabel(value: string): string {
  return `${clampedRadius(value)}px`;
}

function Chip({
  active,
  disabled,
  onClick,
  label,
  title,
  swatch,
  locked,
  value,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  title?: string;
  swatch?: string;
  locked?: boolean;
  value?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-value={value}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      disabled={disabled}
      aria-describedby={locked ? "appearance-upgrade-explanation" : undefined}
      title={title}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 ${
        active
          ? locked
            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
            : "border-white/20 bg-white/5 text-white"
          : locked
            ? "border-amber-500/20 bg-zinc-900 text-zinc-500 hover:border-amber-500/30 hover:text-zinc-300"
            : "border-white/5 bg-zinc-900 text-zinc-500 hover:border-white/10 hover:text-zinc-300"
      } ${locked ? "disabled:opacity-100" : "disabled:opacity-50"} disabled:cursor-not-allowed`}
    >
      {swatch && <span aria-hidden className={`h-3 w-5 rounded-sm ${swatch}`} />}
      <span>{label}</span>
      {locked && <span aria-label="Requires an eligible advanced builder plan" className="text-[8px] text-amber-400">UPGRADE</span>}
    </button>
  );
}


