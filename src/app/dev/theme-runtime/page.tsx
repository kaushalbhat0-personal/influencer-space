import { themeRegistry } from "@/lib/theme/registry-new";
import { experienceRegistry, THEME_EXPERIENCES, getDecorationPack } from "@/modules/theme/runtime/experience";
import { motionClass, surfaceClass } from "@/modules/theme/runtime/experience";

export const dynamic = "force-dynamic";

/**
 * /dev/theme-runtime — IMPLEMENTATION-45 diagnostics. Shows the resolved
 * Theme → Experience → Background → Decoration → Motion → Divider chain for
 * every registered theme. Engineering tool; useful for future marketplace
 * themes.
 */
export default function ThemeRuntimePage() {
  const themes = themeRegistry.getAll();
  const rows = themes.map((t) => ({
    theme: t,
    experience: experienceRegistry.resolve({ id: t.id, category: t.category, premium: t.premium }),
  }));

  const premiumCount = Object.values(THEME_EXPERIENCES).filter((e) => e.premium).length;

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--text-primary,#FAFAFA)]" data-testid="theme-runtime-title">
            Theme Experience Runtime (dev)
          </h1>
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted,#71717A)]">
            {themes.length} themes · {premiumCount} experience packs
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map(({ theme, experience }) => (
            <div
              key={theme.id}
              data-testid="experience-row"
              className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4 text-xs"
            >
              <p className="mb-2 font-medium text-[var(--text-primary,#FAFAFA)]">
                {theme.name} <span className="text-zinc-500">({theme.id})</span>
              </p>
              <p data-testid="experience-resolution" className="text-zinc-400">
                experience: <span className="text-emerald-400">{experience.name}</span>
                {experience.premium ? " · premium" : ""}
              </p>
              <p className="text-zinc-500">
                background: {experience.background.kind} · decoration: {experience.decoration} · motion: {experience.motion} · divider: {experience.divider} · surface: {experience.surface}
              </p>
              <p className="text-zinc-600">
                pack elements: {getDecorationPack(experience.decoration).elements.length} · motion class: {motionClass(experience.motion) || "none"} · surface class: {surfaceClass(experience.surface) || "flat"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
