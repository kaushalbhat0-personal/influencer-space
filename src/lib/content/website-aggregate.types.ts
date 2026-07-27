export interface WebsiteAggregate {
  identity: {
    name: string;
    tagline: string;
    bio: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    socialLinks: Array<{ platform: string; url: string }>;
  };

  hero: Record<string, unknown>;

  products: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    images: string[];
    slug: string;
    isFeatured: boolean;
    isActive: boolean;
  }>;

  gallery: Array<{
    id: string;
    title: string;
    description: string | null;
    imageUrl: string;
    mediaType: "image" | "video";
    videoUrl: string | null;
    altText: string | null;
    isFeatured: boolean;
  }>;

  links: Array<{
    id: string;
    title: string;
    url: string;
    imageUrl: string | null;
  }>;

  seo: {
    title: string;
    description: string;
  };

  navigation: Array<{
    label: string;
    href: string;
    order: number;
  }>;
}
