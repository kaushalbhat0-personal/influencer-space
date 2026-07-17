import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDecryptedToken, refreshToken } from "@/lib/social-oauth";

const BATCH_SIZE = 5;
const MEDIA_LIMIT = 10;

type PlatformStat = {
  platform: string;
  followers: number;
  views: number;
  posts: number;
};

type ContentItem = {
  platform: string;
  mediaType: "image" | "video";
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  permalink: string | null;
  externalId: string;
};

/* ── YouTube (API key, not OAuth) ── */

async function fetchYouTubeStats(
  apiKey: string,
  channelId: string,
): Promise<PlatformStat | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "statistics");
  url.searchParams.set("id", channelId);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    console.error(`YouTube API returned ${res.status} for channel ${channelId}`);
    return null;
  }

  const data = await res.json();
  const stats = data.items?.[0]?.statistics;
  if (!stats) return null;

  return {
    platform: "youtube",
    followers: Number(stats.subscriberCount) || 0,
    views: Number(stats.viewCount) || 0,
    posts: Number(stats.videoCount) || 0,
  };
}

/* ── Instagram (per-tenant OAuth token) ── */

async function fetchInstagramStats(
  accessToken: string,
): Promise<PlatformStat | null> {
  const url = new URL("https://graph.instagram.com/me");
  url.searchParams.set("fields", "user_id,followers_count,media_count");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    console.error(`Instagram API returned ${res.status}`);
    return null;
  }

  const data = await res.json();
  if (!data || data.followers_count === undefined) return null;

  return {
    platform: "instagram",
    followers: Number(data.followers_count) || 0,
    views: 0,
    posts: Number(data.media_count) || 0,
  };
}

/* ── Twitch (per-tenant OAuth token) ── */

async function fetchTwitchStats(
  accessToken: string,
  channelId: string,
): Promise<PlatformStat | null> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) return null;

  const headers = {
    "Client-ID": clientId,
    Authorization: `Bearer ${accessToken}`,
  };

  const usersUrl = new URL("https://api.twitch.tv/helix/users");
  usersUrl.searchParams.set("login", channelId);

  const usersRes = await fetch(usersUrl.toString(), {
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!usersRes.ok) return null;
  const usersData = await usersRes.json();
  const userId = usersData.data?.[0]?.id;
  if (!userId) return null;

  const streamsUrl = new URL("https://api.twitch.tv/helix/streams");
  streamsUrl.searchParams.set("user_id", userId);

  const streamsRes = await fetch(streamsUrl.toString(), {
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!streamsRes.ok) return null;
  const streamsData = await streamsRes.json();

  const isLive = !!streamsData.data?.length;
  const viewerCount = streamsData.data?.[0]?.viewer_count || 0;

  return {
    platform: "twitch",
    followers: 0,
    views: 0,
    posts: isLive ? viewerCount : 0,
  };
}

/* ── Instagram content items ── */

async function fetchInstagramContent(
  accessToken: string,
): Promise<ContentItem[]> {
  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set(
    "fields",
    "id,media_type,media_url,thumbnail_url,caption,permalink",
  );
  url.searchParams.set("limit", String(MEDIA_LIMIT));
  url.searchParams.set("access_token", accessToken);

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.data?.length) return [];

    return data.data.map((m: Record<string, unknown>) => ({
      platform: "instagram",
      mediaType: m.media_type === "VIDEO" ? "video" as const : "image" as const,
      url: (m.media_url as string) || "",
      thumbnailUrl: (m.thumbnail_url as string) || (m.media_type !== "VIDEO" ? (m.media_url as string) : null) || null,
      caption: (m.caption as string) || null,
      permalink: (m.permalink as string) || null,
      externalId: m.id as string,
    }));
  } catch {
    return [];
  }
}

/* ── YouTube content items ── */

async function fetchYouTubeContent(
  apiKey: string,
  channelId: string,
): Promise<ContentItem[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("order", "date");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(MEDIA_LIMIT));
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.items?.length) return [];

    return data.items.map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown> | undefined;
      const id = item.id as Record<string, unknown> | undefined;
      const videoId = id?.videoId as string | undefined;
      const thumbnails = snippet?.thumbnails as Record<string, unknown> | undefined;
      const high = thumbnails?.high as Record<string, unknown> | undefined;
      const videoUrl = videoId
        ? `https://www.youtube.com/watch?v=${videoId}`
        : "";

      return {
        platform: "youtube",
        mediaType: "video" as const,
        url: videoUrl,
        thumbnailUrl: (high?.url as string) || null,
        caption: (snippet?.title as string) || null,
        permalink: videoUrl || null,
        externalId: videoId || item.id as string,
      };
    });
  } catch {
    return [];
  }
}

/* ── Twitch content items ── */

async function fetchTwitchContent(
  accessToken: string,
  channelId: string,
): Promise<ContentItem[]> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) return [];

  const headers = {
    "Client-ID": clientId,
    Authorization: `Bearer ${accessToken}`,
  };

  try {
    const usersUrl = new URL("https://api.twitch.tv/helix/users");
    usersUrl.searchParams.set("login", channelId);

    const usersRes = await fetch(usersUrl.toString(), {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!usersRes.ok) return [];

    const usersData = await usersRes.json();
    const userId = usersData.data?.[0]?.id;
    if (!userId) return [];

    const clipsUrl = new URL("https://api.twitch.tv/helix/clips");
    clipsUrl.searchParams.set("broadcaster_id", userId);
    clipsUrl.searchParams.set("first", String(MEDIA_LIMIT));

    const clipsRes = await fetch(clipsUrl.toString(), {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!clipsRes.ok) return [];

    const clipsData = await clipsRes.json();
    if (!clipsData.data?.length) return [];

    return clipsData.data.map((c: Record<string, unknown>) => ({
      platform: "twitch",
      mediaType: "video" as const,
      url: (c.thumbnail_url as string)?.replace("-preview-", "-")?.replace(".jpg", ".mp4") || (c.url as string) || "",
      thumbnailUrl: (c.thumbnail_url as string) || null,
      caption: (c.title as string) || null,
      permalink: (c.url as string) || null,
      externalId: c.id as string,
    }));
  } catch {
    return [];
  }
}

/* ── Helpers ── */

async function upsertStats(
  tenantId: string,
  stats: PlatformStat,
): Promise<void> {
  await prisma.socialStats.upsert({
    where: {
      tenantId_platform: { tenantId, platform: stats.platform },
    },
    update: {
      followers: stats.followers,
      views: stats.views,
      posts: stats.posts,
    },
    create: { tenantId, ...stats },
  });
}

async function syncContentItems(
  tenantId: string,
  items: ContentItem[],
): Promise<number> {
  let count = 0;
  for (const item of items) {
    try {
      await prisma.contentFeedItem.upsert({
        where: {
          tenantId_externalId: { tenantId, externalId: item.externalId },
        },
        update: {
          platform: item.platform,
          mediaType: item.mediaType,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
          caption: item.caption,
          permalink: item.permalink,
          syncedAt: new Date(),
        },
        create: {
          tenantId,
          platform: item.platform,
          mediaType: item.mediaType,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
          caption: item.caption,
          permalink: item.permalink,
          externalId: item.externalId,
        },
      });
      count++;
    } catch {
      /* skip individual item failures */
    }
  }
  return count;
}

/* ── Handler ── */

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        youtubeApiKey: true,
        youtubeChannelId: true,
        instagramApiKey: true,
        twitchChannelId: true,
      },
      take: BATCH_SIZE,
      orderBy: { updatedAt: "asc" },
    });

    const results: { tenantId: string; synced: string[] }[] = [];

    for (const tenant of tenants) {
      const synced: string[] = [];

      /* YouTube (API key — no OAuth needed) */
      if (tenant.youtubeApiKey && tenant.youtubeChannelId) {
        const stats = await fetchYouTubeStats(
          tenant.youtubeApiKey,
          tenant.youtubeChannelId,
        );
        if (stats) {
          await upsertStats(tenant.id, stats);
          synced.push("youtube");
        }

        const ytItems = await fetchYouTubeContent(
          tenant.youtubeApiKey,
          tenant.youtubeChannelId,
        );
        if (ytItems.length > 0) {
          const n = await syncContentItems(tenant.id, ytItems);
          console.log(`  synced ${n} YouTube content items`);
        }
      }

      /* Instagram (prefer encrypted OAuth token, fallback to plaintext key) */
      let instaToken: string | null = null;

      try {
        instaToken = await getDecryptedToken(tenant.id, "instagram");
      } catch {
        /* ignore decrypt errors */
      }

      if (!instaToken && tenant.instagramApiKey) {
        instaToken = tenant.instagramApiKey;
      }

      if (instaToken) {
        const stats = await fetchInstagramStats(instaToken);
        if (stats) {
          await upsertStats(tenant.id, stats);
          synced.push("instagram");
        }

        const igItems = await fetchInstagramContent(instaToken);
        if (igItems.length > 0) {
          const n = await syncContentItems(tenant.id, igItems);
          console.log(`  synced ${n} Instagram content items`);
        }
      }

      /* Twitch (prefer encrypted OAuth token) */
      let twitchToken: string | null = null;

      try {
        twitchToken = await getDecryptedToken(tenant.id, "twitch");
      } catch {
        /* ignore decrypt errors */
      }

      if (!twitchToken && tenant.twitchChannelId) {
        try {
          twitchToken = await refreshToken(tenant.id, "twitch");
        } catch {
          /* if refresh also fails, skip Twitch for this cycle */
        }
      }

      if (twitchToken && tenant.twitchChannelId) {
        const stats = await fetchTwitchStats(twitchToken, tenant.twitchChannelId);
        if (stats) {
          await upsertStats(tenant.id, stats);
          synced.push("twitch");
        }

        const twItems = await fetchTwitchContent(twitchToken, tenant.twitchChannelId);
        if (twItems.length > 0) {
          const n = await syncContentItems(tenant.id, twItems);
          console.log(`  synced ${n} Twitch content items`);
        }
      }

      results.push({ tenantId: tenant.id, synced });
    }

    return NextResponse.json({
      ok: true,
      processed: tenants.length,
      results,
      hasMore: tenants.length === BATCH_SIZE,
    });
  } catch (error) {
    console.error("sync-socials error:", error);
    return NextResponse.json(
      { error: "Sync failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
