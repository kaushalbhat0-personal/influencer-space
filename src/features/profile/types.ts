export interface ProfileData {
  name: string;
  tagline: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  socialLinks: SocialLink[];
  contactEmail: string | null;
  categories: string[];
  brandColors: BrandColors;
  languages: string[];
  location: string | null;
}

export interface SocialLink {
  platform: string;
  url: string;
  label?: string;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface ProfileUpdateInput {
  name?: string;
  tagline?: string;
  bio?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  socialLinks?: SocialLink[];
  contactEmail?: string | null;
  categories?: string[];
  brandColors?: BrandColors;
  languages?: string[];
  location?: string | null;
}
