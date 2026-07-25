import type { ContentSource, SocialLink } from "./types";

export class SocialGraph {
  build(source: ContentSource): SocialLink[] {
    const links: SocialLink[] = [];
    const platform = source.platform?.toLowerCase() ?? "unknown";

    links.push({
      platform,
      url: this.buildProfileUrl(platform, source.username),
      handle: source.username,
      followers: source.followers,
      primary: true,
    });

    const mentioned = this.extractMentions(source);
    for (const mention of mentioned.slice(0, 5)) {
      if (!links.some((l) => l.handle === mention)) {
        links.push({
          platform: "mentioned",
          url: `https://${mention}`,
          handle: mention,
          followers: 0,
          primary: false,
        });
      }
    }

    const urls = this.extractUrls(source);
    for (const url of urls.slice(0, 3)) {
      if (!links.some((l) => l.url === url)) {
        links.push({
          platform: "link",
          url,
          handle: new URL(url).hostname,
          followers: 0,
          primary: false,
        });
      }
    }

    return links;
  }

  private buildProfileUrl(platform: string, username: string): string {
    const urls: Record<string, string> = {
      instagram: `https://instagram.com/${username}`,
      twitter: `https://twitter.com/${username}`,
      youtube: `https://youtube.com/@${username}`,
      tiktok: `https://tiktok.com/@${username}`,
      twitch: `https://twitch.tv/${username}`,
      linkedin: `https://linkedin.com/in/${username}`,
      github: `https://github.com/${username}`,
      facebook: `https://facebook.com/${username}`,
    };
    return urls[platform] ?? `https://${platform}.com/${username}`;
  }

  private extractMentions(source: ContentSource): string[] {
    const mentions = new Set<string>();
    for (const item of source.content ?? []) {
      for (const m of item.mentions ?? []) mentions.add(m);
    }
    return Array.from(mentions);
  }

  private extractUrls(source: ContentSource): string[] {
    const urls = new Set<string>();
    for (const link of source.links ?? []) {
      try { new URL(link); urls.add(link); } catch {}
    }
    for (const item of source.content ?? []) {
      const matches = item.text?.match(/https?:\/\/[^\s]+/g) ?? [];
      for (const url of matches) {
        try { new URL(url); urls.add(url); } catch {}
      }
    }
    return Array.from(urls);
  }
}
