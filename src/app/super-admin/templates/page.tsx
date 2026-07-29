import { blueprintRegistry } from "@/lib/blueprint/registry";
import { themeRegistry } from "@/lib/theme/registry-new";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const blueprints = blueprintRegistry.getAll();
  const categories = blueprintRegistry.getCategories();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Website Templates</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {blueprints.length} templates across {categories.length} categories
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {blueprints.map((bp) => {
          const compatibleThemes = bp.recommendedThemes.map((tid) => themeRegistry.getById(tid)).filter(Boolean);
          return (
            <div key={bp.id} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">{bp.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{bp.pages.length} pages · {bp.pages.reduce((s, p) => s + p.sections.length, 0)} sections</p>
                </div>
                <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                  bp.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {bp.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {bp.pages.map((p) => (
                  <span key={p.id} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">{p.name}</span>
                ))}
              </div>
              {compatibleThemes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] text-zinc-600 mr-1">Themes:</span>
                  {compatibleThemes.map((t) => t && (
                    <span key={t.id} className="flex items-center gap-1 rounded bg-zinc-800/50 px-1.5 py-0.5 text-[9px] text-zinc-400">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.variants[0]?.tokens.colors.primary }} />
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
