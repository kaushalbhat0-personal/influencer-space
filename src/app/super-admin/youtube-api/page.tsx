import { youtubeQuota } from "@/lib/providers/youtube/quota";

export const dynamic = "force-dynamic";

export default async function YouTubeApiDashboard() {
  const today = await youtubeQuota.getTodayUsage();
  const history = await youtubeQuota.getUsageHistory(14);
  const recentImports = await youtubeQuota.getRecentlyImportedCreators(20);
  const dailyLimit = youtubeQuota.getDailyLimit();
  const percentUsed = Math.round((today.unitsUsed / dailyLimit) * 100);

  const isWarning = percentUsed > 80;
  const isCritical = percentUsed > 95;

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">YouTube API Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">Monitor YouTube Data API quota usage and recent imports.</p>
      </div>

      {/* Quota Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-500">Quota Used Today</p>
          <p className={`text-2xl font-bold mt-1 ${isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-400"}`}>
            {today.unitsUsed.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-600 mt-1">of {dailyLimit.toLocaleString()} daily</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-500">Percentage Used</p>
          <p className={`text-2xl font-bold mt-1 ${isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-400"}`}>
            {percentUsed}%
          </p>
          <div className="mt-2 h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(percentUsed, 100)}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-500">API Calls Today</p>
          <p className="text-2xl font-bold mt-1 text-white">{today.calls}</p>
          <p className="text-xs text-zinc-600 mt-1">Avg {today.avgLatencyMs.toFixed(0)}ms per call</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-500">Failures</p>
          <p className={`text-2xl font-bold mt-1 ${today.failures > 0 ? "text-red-400" : "text-emerald-400"}`}>{today.failures}</p>
          <p className="text-xs text-zinc-600 mt-1">{today.calls > 0 ? `${Math.round((today.failures / today.calls) * 100)}% failure rate` : "No calls yet"}</p>
        </div>
      </div>

      {/* Quota Trend */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 mb-8">
        <h2 className="text-sm font-semibold text-white mb-4">Daily Quota Usage (14 Days)</h2>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">No usage data yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((day) => {
              const pct = Math.round((day.unitsUsed / dailyLimit) * 100);
              return (
                <div key={day.date.toISOString()} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 w-24">{day.date.toISOString().slice(0, 10)}</span>
                  <div className="flex-1 h-4 rounded bg-zinc-800 overflow-hidden">
                    <div className={`h-full rounded ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-xs text-zinc-400 w-20 text-right">{day.unitsUsed}</span>
                  <span className="text-xs text-zinc-600 w-16 text-right">{day.calls} calls</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Imported Creators */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Recently Imported Creators</h2>
        {recentImports.length === 0 ? (
          <p className="text-sm text-zinc-500">No creators imported yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-zinc-500 uppercase">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Handle</th>
                <th className="pb-2 font-medium">Last Fetched</th>
              </tr>
            </thead>
            <tbody>
              {recentImports.map((c) => (
                <tr key={c.handle} className="border-t border-white/5 text-sm">
                  <td className="py-2 text-white">{c.name}</td>
                  <td className="py-2 text-zinc-400">@{c.handle}</td>
                  <td className="py-2 text-zinc-500">{c.fetchedAt.toISOString().slice(0, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
