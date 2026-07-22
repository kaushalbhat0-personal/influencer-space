import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ThemesStudioPage() {
  const themes = await prisma.designTheme.findMany({
    include: { tenant: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const total = themes.length;
  const active = themes.filter((t) => t.active).length;

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Theme Studio</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage design themes and tokens across all tenants.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Total Themes</p>
          <p className="text-2xl font-bold text-white mt-1">{total}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Active Themes</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{active}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Token Categories</p>
          <p className="text-2xl font-bold text-white mt-1">7</p>
          <p className="text-xs text-zinc-600 mt-1">Colors, Typography, Spacing, Radius, Shadows, Borders, Motion</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-zinc-500 uppercase border-b border-white/5">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Tenant</th>
              <th className="p-3 font-medium">Mode</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {themes.map((t) => (
              <tr key={t.id} className="border-b border-white/5 text-sm hover:bg-white/[0.02]">
                <td className="p-3 text-white font-medium">{t.name}</td>
                <td className="p-3 text-zinc-400">{t.tenant?.name || "—"}</td>
                <td className="p-3">
                  <span className="text-xs text-zinc-500">{t.mode}</span>
                </td>
                <td className="p-3">
                  {t.active ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">Active</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-500">Inactive</span>
                  )}
                </td>
                <td className="p-3 text-zinc-500 text-xs">{t.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
            {themes.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500 text-sm">No themes created yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
