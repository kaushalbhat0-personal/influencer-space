import { themeRegistry } from "@/lib/theme/registry-new";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const themes = themeRegistry.getAll();
  const categories = themeRegistry.getCategories();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Themes</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {themes.length} themes across {categories.length} categories
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const catThemes = themes.filter((t) => t.category === category);
          return (
            <div key={category} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                {category}
                <span className="ml-2 text-zinc-600 font-normal">({catThemes.length})</span>
              </h3>
              <div className="space-y-2">
                {catThemes.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: t.variants[0]?.tokens.colors.primary }} />
                      <span className="text-sm text-zinc-300 truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.variants.map((v) => (
                        <span key={v.mode} className="rounded bg-zinc-700/50 px-1.5 py-0.5 text-[9px] text-zinc-500">{v.mode}</span>
                      ))}
                      {t.premium && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-400">PRO</span>}
                      {t.featured && <span className="rounded bg-s8ul-cyan/10 px-1.5 py-0.5 text-[9px] text-s8ul-cyan">Featured</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
