/**
 * Storefront SEO Metadata Builder v1.0.0
 *
 * Creates page-level metadata (title, description, OG, Twitter, JSON-LD)
 * from PublicPageData. Used by generateMetadata() in the storefront route.
 */

import type { Metadata } from "next";
import type { PublicPageData } from "@/services/public.service";

export function buildStorefrontMetadata(data: PublicPageData, canonicalUrl: string): Metadata {
  const { profile } = data;
  const title = profile.name ? `${profile.name} — CreatorStore` : "CreatorStore";
  const description = profile.tagline || profile.bio || "Creator profile on CreatorStore";
  const canonical = canonicalUrl.startsWith("http") ? canonicalUrl : `https://${canonicalUrl}`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "CreatorStore",
      type: "profile",
      ...(profile.profileImage && {
        images: [{ url: profile.profileImage, width: 800, height: 800 }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(profile.profileImage && { images: [profile.profileImage] }),
    },
  };
}

export function buildStorefrontJsonLd(data: PublicPageData, canonicalUrl: string) {
  const { profile, products } = data;

  const sameAs = [
    profile.social.instagram,
    profile.social.youtube,
    profile.social.twitter,
    profile.social.tiktok,
  ].filter(Boolean);

  const profileLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    description: profile.tagline || profile.bio || undefined,
    ...(profile.profileImage && { image: profile.profileImage }),
    ...(sameAs.length > 0 && { sameAs }),
    url: canonicalUrl,
  };

  let productListLd = null;
  if (products.length > 0) {
    productListLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: p.name,
          ...(p.description && { description: p.description }),
          ...(p.imageUrl && { image: p.imageUrl }),
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: "INR",
            availability: "https://schema.org/InStock",
          },
        },
      })),
    };
  }

  return { profileLd, productListLd };
}
