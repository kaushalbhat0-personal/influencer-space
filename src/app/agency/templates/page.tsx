import { blueprintRegistry } from "@/lib/blueprint/registry";
import { themeRegistry } from "@/lib/theme/registry-new";
import { ContentContainer, PageHeader } from "@/components/layout";

export const dynamic = "force-dynamic";

export default async function AgencyTemplatesPage() {
  const blueprints = blueprintRegistry.getAll();
  const themes = themeRegistry.getAll();

  return (
    <ContentContainer>
      <PageHeader title="Templates" description="Blueprint + theme catalog your agency can apply to creator workspaces."
        breadcrumbs={[{ label: "Agency", href: "/agency" }, { label: "Templates" }]} />

      <h3 className="mb-3 text-sm font-medium text-zinc-300" data-testid="templates-blueprints">Blueprints ({blueprints.length})</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {blueprints.map((b) => (
          <div key={b.id} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">{b.name}</h4>
            <p className="mt-1 text-xs text-zinc-500">{b.description}</p>
            <span className="mt-2 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">{b.category}</span>
          </div>
        ))}
      </div>

      <h3 className="mb-3 mt-8 text-sm font-medium text-zinc-300" data-testid="templates-themes">Themes ({themes.length})</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((t) => (
          <div key={t.id} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <h4 className="text-sm font-semibold text-white">{t.name}</h4>
            <div className="mt-2 flex gap-1.5">
              {(t.colorSwatches?.slice(0, 3) ?? []).map((c) => (
                <span key={c} className="h-4 w-4 rounded-full border border-white/10" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ContentContainer>
  );
}
