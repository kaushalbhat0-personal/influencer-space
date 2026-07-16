import { SocialApiService } from "@/services/social-api.service";

interface LiveMilestonesProps {
  tenantId: string;
  youtubeChannelId?: string | null;
  twitchChannelId?: string | null;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export async function LiveMilestones({
  youtubeChannelId,
  twitchChannelId,
}: LiveMilestonesProps) {
  const [ytStats, twitchStats] = await Promise.all([
    youtubeChannelId ? SocialApiService.getYouTubeStats(youtubeChannelId) : null,
    twitchChannelId ? SocialApiService.getTwitchStats(twitchChannelId) : null,
  ]);

  if (!ytStats && !twitchStats) return null;

  return (
    <section className="relative px-4 py-12 sm:py-16 md:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black/90" />
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ytStats && (
            <div className="group rounded-2xl border border-red-500/20 bg-white/[0.03] p-6 backdrop-blur-xl transition-colors hover:border-red-500/30">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-400">
                    YouTube
                  </p>
                  <p className="text-2xl font-bold text-white font-display">
                    {formatCompact(ytStats.subscriberCount)}
                  </p>
                  <p className="text-xs text-gray-500">subscribers</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/[0.02] px-3 py-2.5 text-center">
                  <p className="text-base font-semibold text-white">
                    {formatCompact(ytStats.viewCount)}
                  </p>
                  <p className="text-[10px] text-gray-500">total views</p>
                </div>
                <div className="rounded-lg bg-white/[0.02] px-3 py-2.5 text-center">
                  <p className="text-base font-semibold text-white">
                    {ytStats.videoCount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500">videos</p>
                </div>
              </div>
            </div>
          )}

          {twitchStats && (
            <div
              className={`rounded-2xl border p-6 backdrop-blur-xl transition-colors ${
                twitchStats.isLive
                  ? "border-purple-500/30 bg-purple-500/[0.03] hover:border-purple-500/50"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    twitchStats.isLive ? "bg-purple-500/10" : "bg-white/5"
                  }`}
                >
                  <svg
                    className={`h-5 w-5 ${twitchStats.isLive ? "text-purple-400" : "text-gray-500"}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-400">
                    Twitch
                  </p>
                  {twitchStats.isLive ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-purple-500 shadow-[0_0_8px_rgba(147,51,234,0.6)]" />
                        <span className="text-sm font-bold uppercase tracking-wider text-purple-400">
                          Live Now
                        </span>
                      </div>
                      <p className="text-lg font-bold text-white">
                        {twitchStats.viewerCount.toLocaleString()}
                        <span className="text-sm font-normal text-gray-500"> viewers</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-gray-500">Offline</p>
                  )}
                </div>
              </div>
              {twitchStats.isLive && twitchStats.title && (
                <p className="mt-3 line-clamp-2 text-sm text-gray-300">
                  {twitchStats.title}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
