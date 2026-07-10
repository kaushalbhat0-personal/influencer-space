import { NextResponse } from "next/server";

type InstagramPost = {
  id: string;
  media_url: string;
  caption: string;
  permalink: string;
  media_type: string;
};

export async function GET() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const res = await fetch(
      `https://graph.instagram.com/v12.0/me/media?fields=id,media_url,caption,permalink,media_type&access_token=${accessToken}&limit=6`,
      { next: { revalidate: 3600 } },
    );

    if (!res.ok) {
      return NextResponse.json({ posts: [] });
    }

    const data = await res.json();

    const posts: InstagramPost[] = (data.data || []).map(
      (post: InstagramPost) => ({
        id: post.id,
        media_url: post.media_url,
        caption: post.caption || "",
        permalink: post.permalink,
        media_type: post.media_type,
      }),
    );

    return NextResponse.json({ posts });
  } catch {
    return NextResponse.json({ posts: [] });
  }
}
