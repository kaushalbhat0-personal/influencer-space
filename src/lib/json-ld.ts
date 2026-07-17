import type { PublicProfile, PublicProductData } from "@/services/public.service";

export function generateProfileJsonLd(profile: PublicProfile, url: string, socialUrls: string[]) {
  const sameAs = socialUrls.filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    description: profile.tagline || profile.bio || undefined,
    ...(profile.profileImage && { image: profile.profileImage }),
    ...(sameAs.length > 0 && { sameAs }),
    url,
  };
}

export function generateProductListJsonLd(products: PublicProductData[]) {
  if (products.length === 0) return null;

  return {
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
