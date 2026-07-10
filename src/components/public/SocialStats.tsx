import { getInfluencerConfig } from "@/config/influencer";

type ChannelStats = {
  subscribers: number;
  views: number;
  videos: number;
};

async function getYouTubeStats(): Promise<ChannelStats | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const config = await getInfluencerConfig();
    const youtubeUrl = config.social.youtube;
    if (!youtubeUrl) return null;

    const channelMatch = youtubeUrl.match(
      /(?:channel\/|@)([^/?]+)/,
    );
    const channelId = channelMatch?.[1];
    if (!channelId) return null;

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`,
      { next: { revalidate: 3600 } },
    );

    if (!res.ok) return null;

    const data = await res.json();
    const stats = data.items?.[0]?.statistics;
    if (!stats) return null;

    return {
      subscribers: Number(stats.subscriberCount) || 0,
      views: Number(stats.viewCount) || 0,
      videos: Number(stats.videoCount) || 0,
    };
  } catch {
    return null;
  }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export async function SocialStats() {
  const config = await getInfluencerConfig();
  const youtubeStats = await getYouTubeStats();

  const stats = [
    {
      label: "Instagram Followers",
      value: "50K+",
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" />
        </svg>
      ),
      show: true,
    },
    {
      label: "YouTube Subscribers",
      value: youtubeStats ? formatCount(youtubeStats.subscribers) : "10K+",
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
      show: !!config.social.youtube,
    },
    {
      label: "Videos",
      value: youtubeStats ? formatCount(youtubeStats.videos) : "100+",
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      show: !!config.social.youtube,
    },
    {
      label: "Lives Transformed",
      value: "6+ Years",
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      show: true,
    },
  ];

  const visibleStats = stats.filter((s) => s.show);

  return (
    <section className="relative px-4 py-12 sm:py-16">
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-black/80" />
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {visibleStats.map((stat, i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm"
            >
              <div className="mb-3 text-amber-400">{stat.icon}</div>
              <div className="mb-1 text-2xl font-bold text-white sm:text-3xl">
                {stat.value}
              </div>
              <div className="text-xs text-white/50 sm:text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
