/**
 * IMPLEMENTATION-18A — Hero Social Links Migration.
 *
 * Moves every existing hardcoded / duplicated link source into hero_data.socialLinks,
 * the single source of truth owned by Hero:
 *   - Brand.socialLinks            (legacy profile social links)
 *   - AffiliateLink rows           (legacy Links module storage)
 *   - hero_data.ctaLink / ctaSecondaryLink (hardcoded YouTube/Instagram CTAs)
 *   - existing hero_data.socialLinks (no-op if already present)
 *
 * Idempotent: re-running merges without duplicating. No data loss.
 *
 * Run:  npx tsx scripts/migrate-hero-social.ts [--apply]
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

interface LinkLike {
  platform: string;
  url: string;
  label?: string;
}

function platformOfUrl(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("x.com") || u.includes("twitter.com")) return "x";
  if (u.includes("facebook.com") || u.includes("fb.com")) return "facebook";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("discord")) return "discord";
  if (u.includes("t.me") || u.includes("telegram")) return "telegram";
  if (u.includes("wa.me") || u.includes("whatsapp")) return "whatsapp";
  if (u.includes("kick.com")) return "kick";
  if (u.includes("twitch.tv")) return "twitch";
  if (u.startsWith("mailto:")) return "email";
  if (u.startsWith("tel:")) return "phone";
  return "custom";
}

function mergeLinks(existing: LinkLike[], incoming: LinkLike[]): LinkLike[] {
  const seen = new Set<string>();
  const out: LinkLike[] = [];
  for (const l of [...existing, ...incoming]) {
    if (!l.url) continue;
    const key = l.url.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ platform: l.platform || platformOfUrl(l.url), url: l.url.trim(), label: l.label?.trim() || undefined });
  }
  return out;
}

async function main() {
  const url = process.env.DATABASE_URL || "";
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const apply = process.argv.includes("--apply");
  console.log(`Hero Social Links migration — ${apply ? "APPLYING" : "DRY RUN (use --apply to commit)"}`);

  const websites = await prisma.website.findMany({ select: { id: true, tenantId: true } });
  let migrated = 0;

  for (const website of websites) {
    const tenantId = website.tenantId;

    const [brand, affiliateLinks, heroSetting] = await Promise.all([
      prisma.brand.findUnique({
        where: { websiteId: website.id },
        select: { name: true, tagline: true, bio: true, avatarUrl: true, avatarAssetId: true, socialLinks: true },
      }),
      prisma.affiliateLink.findMany({ where: { tenantId, isActive: true }, select: { title: true, url: true } }),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "hero_data" } } }),
    ]);

    const brandLinks: LinkLike[] = Array.isArray(brand?.socialLinks)
      ? ((brand.socialLinks as Array<{ platform?: string; url: string }>).map((s) => ({
          platform: s.platform || platformOfUrl(s.url || ""),
          url: s.url,
        })))
      : [];

    const affiliateLinksMapped: LinkLike[] = affiliateLinks.map((l) => ({
      platform: platformOfUrl(l.url),
      url: l.url,
      label: l.title,
    }));

    const hero = (heroSetting?.value ?? {}) as Record<string, unknown>;
    const heroCtaLinks: LinkLike[] = [];
    if (typeof hero.ctaLink === "string" && hero.ctaLink) {
      heroCtaLinks.push({ platform: platformOfUrl(hero.ctaLink), url: hero.ctaLink });
    }
    if (typeof hero.ctaSecondaryLink === "string" && hero.ctaSecondaryLink) {
      heroCtaLinks.push({ platform: platformOfUrl(hero.ctaSecondaryLink), url: hero.ctaSecondaryLink });
    }

    const existingSocial: LinkLike[] = Array.isArray(hero.socialLinks)
      ? (hero.socialLinks as LinkLike[])
      : [];

    const merged = mergeLinks(existingSocial, [...brandLinks, ...affiliateLinksMapped, ...heroCtaLinks]);

    // ── Creator identity: copy Brand identity into Hero (no overwrite) ──
    const identityPatches: Record<string, unknown> = {};
    if (brand && typeof hero.name !== "string" && brand.name) identityPatches.name = brand.name;
    if (brand && typeof hero.tagline !== "string" && brand.tagline) identityPatches.tagline = brand.tagline;
    if (brand && typeof hero.bio !== "string" && brand.bio) identityPatches.bio = brand.bio;
    if (brand && !hero.profilePictureUrl && brand.avatarUrl) {
      identityPatches.profilePictureUrl = brand.avatarUrl;
      if (brand.avatarAssetId && !hero.profilePictureAssetId) identityPatches.profilePictureAssetId = brand.avatarAssetId;
    }

    if (merged.length !== existingSocial.length || Object.keys(identityPatches).length > 0) {
      const action = apply ? "→ merged" : "→ would merge";
      console.log(`${tenantId} ${action}: links ${existingSocial.length} → ${merged.length}; identity keys ${Object.keys(identityPatches).join(",") || "none"}`);
      for (const l of merged) console.log(`    ${l.platform.padEnd(10)} ${l.url}`);
      if (apply) {
        await prisma.setting.upsert({
          where: { tenantId_key: { tenantId, key: "hero_data" } },
          update: { value: { ...hero, socialLinks: merged, ...identityPatches } as never },
          create: { tenantId, key: "hero_data", value: { ...hero, socialLinks: merged, ...identityPatches } as never },
        });
        migrated++;
      }
    }
  }

  console.log(apply ? `Migrated ${migrated} tenant(s).` : `Dry run complete. ${migrated} tenant(s) would be updated.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
