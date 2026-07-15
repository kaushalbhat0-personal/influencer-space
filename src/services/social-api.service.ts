const HOUR_SECONDS = 3600;

export interface YouTubeStats {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export interface TwitchStats {
  isLive: boolean;
  viewerCount: number;
  title: string;
}

interface YouTubeApiResponse {
  items?: {
    statistics: {
      subscriberCount: string;
      viewCount: string;
      videoCount: string;
    };
  }[];
}

interface TwitchUsersResponse {
  data?: { id: string }[];
}

interface TwitchStreamsResponse {
  data?: {
    title: string;
    viewer_count: number;
  }[];
}

async function twitchToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      next: { revalidate: HOUR_SECONDS },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: HOUR_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const SocialApiService = {
  async getYouTubeStats(channelId: string): Promise<YouTubeStats | null> {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return null;

    const url =
      `https://www.googleapis.com/youtube/v3/channels` +
      `?part=statistics&id=${encodeURIComponent(channelId)}&key=${key}`;

    const data = await fetchJson<YouTubeApiResponse>(url);
    if (!data?.items?.length) return null;

    const stats = data.items[0].statistics;

    return {
      subscriberCount: parseInt(stats.subscriberCount, 10) || 0,
      viewCount: parseInt(stats.viewCount, 10) || 0,
      videoCount: parseInt(stats.videoCount, 10) || 0,
    };
  },

  async getTwitchStats(channelId: string): Promise<TwitchStats | null> {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const token = await twitchToken();
    if (!clientId || !token) return null;

    const headers = {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    };

    const usersUrl = `https://api.twitch.tv/helix/users?login=${encodeURIComponent(channelId)}`;
    const users = await fetchJson<TwitchUsersResponse>(usersUrl, headers);
    const userId = users?.data?.[0]?.id;
    if (!userId) return null;

    const streamsUrl = `https://api.twitch.tv/helix/streams?user_id=${userId}`;
    const streams = await fetchJson<TwitchStreamsResponse>(streamsUrl, headers);

    if (streams?.data?.length) {
      const stream = streams.data[0];
      return {
        isLive: true,
        viewerCount: stream.viewer_count,
        title: stream.title,
      };
    }

    return {
      isLive: false,
      viewerCount: 0,
      title: "",
    };
  },
};
