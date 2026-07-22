import { prisma } from "@/lib/prisma";
import type { CreatorProfile } from "@/lib/creators/types";

interface CacheEntry {
  profile: CreatorProfile;
  accountId: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

class YouTubeCacheService {
  async get(handle: string): Promise<CacheEntry | null> {
    // Normalize handle
    const normalized = handle.replace(/^@/, "").toLowerCase();

    const account = await prisma.providerAccount.findFirst({
      where: {
        provider: "youtube",
        handle: { contains: normalized },
        fetchedAt: { not: null },
      },
      orderBy: { fetchedAt: "desc" },
    });

    if (!account || !account.fetchedAt) return null;

    // Check expiry
    const expiresAt = account.expiresAt || new Date(account.fetchedAt.getTime() + CACHE_TTL_MS);
    if (new Date() > expiresAt) return null;

    const profileData = account.profileData as Record<string, unknown>;
    return {
      profile: profileData as unknown as CreatorProfile,
      accountId: account.id,
    };
  }

  async set(handle: string, profile: CreatorProfile, channelId?: string | null): Promise<string> {
    const normalized = handle.replace(/^@/, "").toLowerCase();

    const data = JSON.parse(JSON.stringify({
      provider: "youtube",
      externalId: channelId || normalized,
      handle: normalized,
      name: profile.name,
      profileData: profile,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    }));

    const account = await prisma.providerAccount.upsert({
      where: {
        provider_externalId: {
          provider: "youtube",
          externalId: channelId || normalized,
        },
      },
      create: data,
      update: data,
    });

    return account.id;
  }

  async invalidate(handle: string): Promise<void> {
    const normalized = handle.replace(/^@/, "").toLowerCase();
    await prisma.providerAccount.updateMany({
      where: { provider: "youtube", handle: { contains: normalized } },
      data: { expiresAt: new Date(0) },
    });
  }
}

export const youtubeCache = new YouTubeCacheService();
