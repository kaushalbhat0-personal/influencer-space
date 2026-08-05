import { blueprintRegistry } from "@/lib/blueprint/registry";
import { themeRegistry } from "@/lib/theme/registry-new";

export const dynamic = "force-dynamic";

export default function SuperAdminBlueprintsPage() {
  const blueprints = blueprintRegistry.getAll();
  const categories = blueprintRegistry.getCategories();
  const activeCount = blueprints.filter((b) => b.status === "active").length;
  const comingSoonCount = blueprints.filter((b) => b.status === "coming_soon").length;

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Blueprint Registry</h1><p className="mt-1 text-sm text-zinc-400">{blueprints.length} blueprints · {activeCount} active · {comingSoonCount} coming soon</p></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blueprints.map((bp) => {
            const recommendedThemes = blueprintRegistry.getCompatibleThemes(bp.id);
            return (
              <div key={bp.id} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{bp.name}</h3>
                    <p className="text-[10px] text-zinc-500">{bp.id} · {bp.category}</p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${bp.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{bp.status}</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">{bp.description}</p>
                <div className="space-y-2 text-[11px]">
                  <p className="text-zinc-500">{bp.pages.length} pages · {bp.pages.reduce((s, p) => s + p.sections.length, 0)} sections · {bp.navigation.filter((n) => n.visible).length} nav items</p>
                  {recommendedThemes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recommendedThemes.map((themeId) => {
                        const theme = themeRegistry.getById(themeId);
                        return <span key={themeId} className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{theme?.name ?? themeId}</span>;
                      })}
                    </div>
                  )}
                  {bp.requiredCapabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {bp.requiredCapabilities.map((cap) => <span key={cap} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 font-mono">{cap}</span>)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
