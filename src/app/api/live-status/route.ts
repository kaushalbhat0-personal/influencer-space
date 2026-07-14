import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SNAX_CHANNEL_ID = "UC6v9dPaN5P7mNOdG1Rid_9Q";

export async function GET() {
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({
      isLive: false,
      title: "",
      platform: "youtube",
      url: "https://youtube.com/@SnaxGaming",
    });
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${SNAX_CHANNEL_ID}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`,
      { next: { revalidate: 60 } },
    );

    if (!res.ok) {
      return NextResponse.json({
        isLive: false,
        title: "",
        platform: "youtube",
        url: "https://youtube.com/@SnaxGaming",
      });
    }

    const data = await res.json();
    const liveItem = data.items?.[0];

    if (liveItem) {
      return NextResponse.json({
        isLive: true,
        title: liveItem.snippet.title,
        platform: "youtube" as const,
        url: `https://youtube.com/watch?v=${liveItem.id.videoId}`,
        viewerCount: undefined,
      });
    }

    return NextResponse.json({
      isLive: false,
      title: "",
      platform: "youtube",
      url: "https://youtube.com/@SnaxGaming",
    });
  } catch {
    return NextResponse.json({
      isLive: false,
      title: "",
      platform: "youtube",
      url: "https://youtube.com/@SnaxGaming",
    });
  }
}
