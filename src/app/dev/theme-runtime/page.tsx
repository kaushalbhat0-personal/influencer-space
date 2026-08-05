import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { themeRegistry } from "@/lib/theme/registry-new";
import { experienceRegistry, THEME_EXPERIENCES, EXPERIENCE_MIN_PLAN, isExperienceAvailableForPlan, getDecorationPack } from "@/modules/theme/runtime/experience";
import { motionClass, surfaceClass } from "@/modules/theme/runtime/experience";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { resolvePlan } from "@/lib/capabilities/plan-resolution";
import { prisma } from "@/lib/prisma";
import { getCreatorCommercePlans } from "@/config/commerce/plans";

export const dynamic = "force-dynamic";

export default async function ThemeRuntimePage() {
  const session = await getServerSession(authOptions);
  const themes = themeRegistry.getAll();
  const rows = themes.map((t) => ({
    theme: t,
    experience: experienceRegistry.resolve({ id: t.id, category: t.category, premium: t.premium }),
  }));

  const premiumCount = Object.values(THEME_EXPERIENCES).filter((e) => e.premium).length;
  const allExperiences = Object.values(THEME_EXPERIENCES);

  let activePlanCode: string | null = null;
  if (session?.user) {
    const ws = await prisma.workspace.findFirst({ where: { tenantId: session.user.tenantId ?? undefined } }).catch(() => null);
    if (ws) {
      const resolved = await resolveActivePlan(ws.id, ws.tenantId).catch(() => null);
      activePlanCode = resolved?.code ?? null;
    }
  }
  const planName = activePlanCode ? resolvePlan(activePlanCode).displayName : "Unknown";
  const creatorPlans = getCreatorCommercePlans();

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--text-primary,#FAFAFA)]" data-testid="theme-runtime-title">
            Theme Experience Runtime (dev)
          </h1>
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted,#71717A)]">
            {themes.length} themes · {premiumCount} experience packs
          </span>
        </div>

        {/* Plan status */}
        {activePlanCode && (
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-400">
            Active plan: <span className="text-emerald-400 font-medium">{planName}</span> ({activePlanCode})
          </div>
        )}

        {/* Experience Registry */}
        <section className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4">
          <h2 className="mb-3 font-medium text-[var(--text-primary,#FAFAFA)]">Experience Registry</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="experience-registry">
              <thead><tr className="text-zinc-500">
                <th className="text-left pb-1 pr-2">Experience</th>
                <th className="text-left pb-1 pr-2">Background</th>
                <th className="text-left pb-1 pr-2">Decoration</th>
                <th className="text-left pb-1 pr-2">Divider</th>
                <th className="text-left pb-1 pr-2">Motion</th>
                <th className="text-left pb-1 pr-2">Surface</th>
                <th className="text-left pb-1 pr-2">Min Plan</th>
                <th className="text-left pb-1">Available</th>
              </tr></thead>
              <tbody>
                {allExperiences.map((exp) => {
                  const minPlan = EXPERIENCE_MIN_PLAN[exp.id] ?? "free";
                  const available = isExperienceAvailableForPlan(exp.id, activePlanCode);
                  return (
                    <tr key={exp.id} className="border-t border-white/5 text-zinc-300" data-experience={exp.id} data-available={String(available)}>
                      <td className="py-1 pr-2 font-medium">
                        {exp.name} {exp.premium ? <span className="text-amber-400 text-[10px]">★</span> : ""}
                      </td>
                      <td className="py-1 pr-2 text-zinc-400">{exp.background.kind}{exp.background.glow ? `·${exp.background.glow}` : ""}{exp.background.pattern ? `·${exp.background.pattern}` : ""}</td>
                      <td className="py-1 pr-2 text-zinc-400">{exp.decoration} ({getDecorationPack(exp.decoration).elements.length})</td>
                      <td className="py-1 pr-2 text-zinc-400">{exp.divider}</td>
                      <td className="py-1 pr-2 text-zinc-400">{exp.motion}</td>
                      <td className="py-1 pr-2 text-zinc-400">{exp.surface}</td>
                      <td className="py-1 pr-2 font-mono text-zinc-500">{minPlan}</td>
                      <td className={`py-1 font-medium ${available ? "text-emerald-400" : "text-red-400"}`}>{available ? "Yes" : "Locked"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Creator Plan Eligibility Matrix */}
        <section className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4">
          <h2 className="mb-3 font-medium text-[var(--text-primary,#FAFAFA)]">Plan → Experience Eligibility</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="plan-experience-matrix">
              <thead>
                <tr className="text-zinc-500">
                  <th className="text-left pb-1 pr-2">Experience</th>
                  {creatorPlans.map((p) => (
                    <th key={p.code} className="pb-1 px-1">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allExperiences.map((exp) => (
                  <tr key={exp.id} className="border-t border-white/5 text-zinc-300">
                    <td className="py-1 pr-2 font-medium">{exp.name}</td>
                    {creatorPlans.map((p) => {
                      const available = isExperienceAvailableForPlan(exp.id, p.code);
                      return (
                        <td key={p.code} className={`py-1 px-1 text-center ${available ? "text-emerald-400" : "text-zinc-700"}`}>
                          {available ? "✓" : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Theme → Experience Resolution */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map(({ theme, experience }) => (
            <div
              key={theme.id}
              data-testid="experience-row"
              className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4 text-xs"
            >
              <p className="mb-2 font-medium text-[var(--text-primary,#FAFAFA)]">
                {theme.name} <span className="text-zinc-500">({theme.id})</span>
                {theme.premium ? <span className="ml-1 text-amber-400">★</span> : ""}
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
