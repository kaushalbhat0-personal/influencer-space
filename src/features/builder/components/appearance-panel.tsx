"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { updateTheme } from "@/actions/theme.actions";
import { builderEvents } from "@/lib/builder/events";
import { FONT_OPTIONS, HEADING_WEIGHT_OPTIONS } from "@/lib/theme/font-options";
import { BACKGROUND_PRESETS, SURFACE_PRESETS } from "@/modules/theme/runtime/experience/experience-overrides";
import { HERO_TEXT_ALIGN_OPTIONS, HERO_CONTENT_WIDTH_OPTIONS, HERO_OVERLAY_OPTIONS } from "@/lib/hero/presentation-options";
import { MediaField } from "@/components/shared/MediaField";

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
}: {
  tenantId?: string | null;
  appearance: AppearanceState;
  advancedBuilder: boolean;
}) {
  const [state, setState] = useState<AppearanceState>(appearance);
  const [pending, startTransition] = useTransition();

  // Re-sync if the overview reloads with new persisted values.
  useEffect(() => {
    setState(appearance);
  }, [appearance]);

  function applyChange(partial: Partial<AppearanceState>) {
    const prev = state;
    const next = { ...state, ...partial };
    setState(next);
    if (!tenantId) return;
    startTransition(async () => {
      const res = await updateTheme(tenantId, partial);
      if (!res.success) {
        // Revert optimistic state if the server rejected (e.g. entitlement lost).
        setState(prev);
        return;
      }
      // RCCF-71.2: tell the canvas to refetch the live preview so it reflects
      // the persisted appearance exactly like the preview route + publish.
      builderEvents.emit("appearance:changed", { timestamp: Date.now() });
    });
  }

  const locked = !advancedBuilder;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">Appearance</span>
        {pending && <span className="text-[9px] text-zinc-600">Saving…</span>}
      </div>

      {locked && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] text-amber-300/90">
          Custom appearance (typography, backgrounds, surfaces, radius, density, hero presentation) requires an{" "}
          <span className="font-semibold">eligible advanced builder</span> plan.{" "}
          <Link href="/admin/billing" className="underline underline-offset-2 hover:text-amber-200">
            Upgrade
          </Link>
        </div>
      )}

      {/* Typography — font */}
      <Field label="Font">
        <div className="flex flex-wrap gap-1">
          {FONT_OPTIONS.map((f) => (
            <Chip
              key={f.value}
              active={state.font === f.value}
              disabled={locked || pending}
              onClick={() => applyChange({ font: f.value })}
              label={f.label}
            />
          ))}
        </div>
      </Field>

      {/* Heading weight */}
      <Field label="Heading weight">
        <div className="flex flex-wrap gap-1">
          {HEADING_WEIGHT_OPTIONS.map((w) => (
            <Chip
              key={w.value}
              active={state.headingWeight === w.value}
              disabled={locked || pending}
              onClick={() => applyChange({ headingWeight: w.value })}
              label={w.label}
            />
          ))}
        </div>
      </Field>

      {/* Background preset */}
      <Field label="Background">
        <div className="flex flex-wrap gap-1">
          {Object.values(BACKGROUND_PRESETS).map((p) => (
            <Chip
              key={p.id}
              active={state.experienceBackground === p.id}
              disabled={locked || pending}
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
              <p className="text-[9px] uppercase tracking-wider text-zinc-600">
                Image opacity ({clampedImageOpacity(state.experienceBackgroundImageOpacity)}%)
              </p>
              <input
                type="range"
                min="5"
                max="90"
                step="5"
                value={clampedImageOpacity(state.experienceBackgroundImageOpacity)}
                onChange={(event) => applyChange({ experienceBackgroundImageOpacity: event.target.value })}
                disabled={pending}
                aria-label="Background image opacity"
                className="w-full accent-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        )}
      </Field>

      {/* Surface preset */}
      <Field label="Surface">
        <div className="flex flex-wrap gap-1">
          {Object.values(SURFACE_PRESETS).map((s) => (
            <Chip
              key={s.id}
              active={state.experienceSurface === s.id}
              disabled={locked || pending}
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
          disabled={locked || pending}
          aria-label="Border radius"
          className="w-full accent-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="flex justify-between text-[9px] text-zinc-600"><span>Sharp</span><span>Soft</span></div>
      </Field>

      <Field label="Layout density">
        <div className="flex flex-wrap gap-1">
          {LAYOUT_DENSITY_OPTIONS.map((density) => (
            <Chip
              key={density}
              active={state.layoutDensity === density}
              disabled={locked || pending}
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
      <Field label="Hero text alignment">
        <div className="flex flex-wrap gap-1">
          {HERO_TEXT_ALIGN_OPTIONS.map((a) => (
            <Chip
              key={a.value}
              active={state.heroTextAlign === a.value}
              disabled={locked || pending}
              onClick={() => applyChange({ heroTextAlign: a.value })}
              label={a.label}
            />
          ))}
        </div>
      </Field>

      <Field label="Hero content width">
        <div className="flex flex-wrap gap-1">
          {HERO_CONTENT_WIDTH_OPTIONS.map((w) => (
            <Chip
              key={w.value}
              active={state.heroContentWidth === w.value}
              disabled={locked || pending}
              onClick={() => applyChange({ heroContentWidth: w.value })}
              label={w.label}
            />
          ))}
        </div>
      </Field>

      <Field label="Hero overlay">
        <div className="flex flex-wrap gap-1">
          {HERO_OVERLAY_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              active={state.heroOverlay === o.value}
              disabled={locked || pending}
              onClick={() => applyChange({ heroOverlay: o.value })}
              label={o.label}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] uppercase tracking-wider text-zinc-600">{label}</p>
      {children}
    </div>
  );
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
  return Number.isFinite(parsed) ? Math.min(90, Math.max(5, parsed)) : 35;
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
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  title?: string;
  swatch?: string;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
        active
          ? "border-white/20 bg-white/5 text-white"
          : "border-white/5 bg-zinc-900 text-zinc-500 hover:border-white/10 hover:text-zinc-300"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {swatch && <span aria-hidden className={`h-3 w-5 rounded-sm ${swatch}`} />}
      <span>{label}</span>
      {locked && <span aria-label="Requires an eligible advanced builder plan" className="text-[8px] text-amber-400">UPGRADE</span>}
    </button>
  );
}
