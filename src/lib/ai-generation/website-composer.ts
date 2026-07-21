/**
 * Website Composer v1.0.0
 *
 * Assembles the website structure from generated content, theme, and profile.
 * Creates the page structure, hero section, and module configurations.
 */

import { BaseAppService } from "@/lib/application/base";
import type { ServiceResult } from "@/lib/application/types";
import type { CreatorProfile } from "./types";
import type { CreatorContent } from "./types";
import type { GeneratedContent } from "./types";
import type { GeneratedTheme } from "./types";
import type { WebsiteComposition } from "./types";
import type { HeroSectionConfig } from "./types";
import type { LinkSectionConfig } from "./types";
import type { GalleryDTO } from "@/lib/application/dtos/gallery";
import type { ProductDTO } from "@/lib/application/dtos/products";

export class WebsiteComposer extends BaseAppService {
  constructor() {
    super("WebsiteComposer");
  }

  compose(
    profile: CreatorProfile,
    content: CreatorContent,
    genContent: GeneratedContent,
    theme: GeneratedTheme
  ): ServiceResult<WebsiteComposition> {
    try {
      const galleryItems: GalleryDTO[] = this.buildGalleryItems(profile, content);
      const products: ProductDTO[] = this.buildProducts(profile, genContent);
      const linkSections: LinkSectionConfig[] = this.buildLinkSections(profile, genContent);
      const featuredSections: string[] = genContent.suggestedSections
        .sort((a, b) => a.priority - b.priority)
        .map((s) => s.type);

      const heroSection: HeroSectionConfig = {
        title: genContent.heroTitle,
        subtitle: genContent.heroSubtitle,
        ctaText: genContent.heroCta,
        ctaLink: "/contact",
        backgroundType: profile.bannerUrl ? "image" : "gradient",
        mediaUrl: profile.bannerUrl,
        overlayOpacity: 0.4,
        alignment: "center",
      };

      const composition: WebsiteComposition = {
        heroSection,
        galleryItems,
        products,
        linkSections,
        featuredSections,
        pageStructure: {
          layout: "single-page",
          sections: [
            { type: "hero", config: heroSection },
            { type: "gallery", visible: galleryItems.length > 0 },
            { type: "products", visible: products.length > 0 },
            { type: "links", visible: linkSections.length > 0 },
            { type: "about", visible: !!genContent.aboutSection },
          ],
          theme: {
            preset: theme.preset,
            colors: {
              primary: theme.primaryColor,
              secondary: theme.secondaryColor,
              accent: theme.accentColor,
            },
          },
        },
      };

      return this.success(composition);
    } catch (error) {
      return this.failed(error, "WebsiteComposition");
    }
  }

  private buildGalleryItems(profile: CreatorProfile, content: CreatorContent): GalleryDTO[] {
    if (!profile.bannerUrl && content.featuredPosts.length === 0) return [];

    return content.featuredPosts.map((post, i) => ({
      id: `gen-gallery-${i}`,
      slug: `gallery-item-${i}`,
      title: post.title,
      description: post.description,
      coverImage: post.thumbnailUrl ?? undefined,
      media: post.mediaUrls.map((url, mi) => ({
        id: `gen-gallery-${i}-media-${mi}`,
        type: "image" as const,
        url,
        alt: post.title,
        sortOrder: mi,
      })),
      mediaCount: post.mediaUrls.length,
      displayMode: "grid" as const,
      status: "draft" as const,
      visibility: "public" as const,
      categories: content.contentThemes,
      tags: [],
      sortOrder: i,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  private buildProducts(_profile: CreatorProfile, genContent: GeneratedContent): ProductDTO[] {
    const hasProductSection = genContent.suggestedSections.some((s) => s.type === "products");
    if (!hasProductSection) return [];

    return [
      {
        id: "gen-product-1",
        name: `${genContent.heroTitle.split(" —")[0]} Merch`,
        slug: "featured-merch",
        description: "Official merchandise and gear",
        price: 0,
        currency: "INR",
        imageUrl: null,
        thumbnail: null,
        category: "merchandise",
        tags: ["featured", "merch"],
        status: "draft",
        visibility: "public",
        inventory: 100,
        isActive: false,
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  private buildLinkSections(
    profile: CreatorProfile,
    genContent: GeneratedContent
  ): LinkSectionConfig[] {
    const hasLinks = genContent.suggestedSections.some((s) => s.type === "links");
    if (!hasLinks) return [];

    const links = profile.socialLinks.map((sl) => ({
      title: sl.platform.charAt(0).toUpperCase() + sl.platform.slice(1),
      url: sl.url,
      icon: sl.platform,
    }));

    if (profile.platformUrl) {
      links.unshift({
        title: "Creator Profile",
        url: profile.platformUrl,
        icon: profile.platform,
      });
    }

    return [
      {
        title: "Connect With Me",
        links: links.length > 0 ? links : [
          { title: "YouTube", url: "#", icon: "youtube" },
          { title: "Instagram", url: "#", icon: "instagram" },
        ],
      },
    ];
  }
}

export const websiteComposer = new WebsiteComposer();
